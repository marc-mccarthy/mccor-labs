#!/usr/bin/env bash
# One script for everything. Run from anywhere in the repo.
#
#   ./infra/deploy.sh setup              one time: state bucket, DNS zone, budget alert
#   ./infra/deploy.sh                    deploy the main site (example.com)
#   ENV_ID=mm ./infra/deploy.sh          deploy your own copy (mm.example.com)
#   ./infra/deploy.sh plan               preview changes without applying
#   ENV_ID=mm ./infra/deploy.sh destroy  delete your copy
#   ./infra/deploy.sh destroy            delete the main site (asks twice)
#
# ENV_ID empty or unset = the main site.

set -euo pipefail
cd "$(dirname "$0")"

ACTION="${1:-apply}"
ENV_ID="${ENV_ID:-}"

# Terraform reaches your `aws login` session through this profile (see README).
# Use the `terraform` profile when it exists, otherwise the default one, so a
# fresh machine with only `[default]` configured still works.
if [[ -z "${AWS_PROFILE:-}" ]]; then
  if aws configure list-profiles 2>/dev/null | grep -qx terraform; then
    AWS_PROFILE=terraform
  else
    AWS_PROFILE=default
  fi
fi
export AWS_PROFILE
unset TF_WORKSPACE # this script picks the workspace itself

# ---------- settings from 1Password ----------
# settings.auto.tfvars is GENERATED from settings.auto.tfvars.tpl, whose
# values are op:// references rather than literals. Edit values in 1Password
# (Development vault, item "mccor-labs-infra"); editing the generated file is
# pointless because the next run overwrites it.
#
# Fails closed on purpose. A stale settings file is worse than none: an
# expired 1Password session would otherwise let a deploy quietly run against
# whatever values happened to be on disk -- including, in the case of the
# mailboxes map, an empty one, which would delete every mailbox password.
if [[ -f settings.auto.tfvars.tpl ]]; then
  if ! command -v op >/dev/null; then
    echo "1Password CLI (op) not found, but settings.auto.tfvars.tpl exists." >&2
    echo "Install it, or write settings.auto.tfvars by hand from the template." >&2
    exit 1
  fi
  # Non-interactive auth, when it has been set up. 1Password authorization via
  # the desktop app is per-process and TTY-bound, so every run of this script
  # earns its own Touch ID prompt no matter how recently the last one passed.
  # A service account token sidesteps that entirely -- op never consults the
  # app. The token lives in the login Keychain, not in a file and not in the
  # shell profile: exported globally it would shadow interactive op use and
  # break anything reading the Private vault, which a service account cannot
  # see. Scoped here, it affects only this script.
  #   Create:  op service-account create mccor-labs-deploy --vault Development:read_items --raw
  #   Store:   security add-generic-password -a "$USER" -s mccor-labs-op-sa -w '<token>' -U
  # Absent the Keychain item this is a no-op and op falls back to the app.
  if _op_token=$(security find-generic-password -s mccor-labs-op-sa -w 2>/dev/null) \
     && [[ -n "$_op_token" ]]; then
    export OP_SERVICE_ACCOUNT_TOKEN="$_op_token"
  fi
  unset _op_token

  if ! op inject -i settings.auto.tfvars.tpl -o settings.auto.tfvars --force; then
    echo "Could not read settings from 1Password. Run 'op signin' and retry." >&2
    echo "Refusing to continue: deploying with stale settings risks applying an" >&2
    echo "empty mailboxes map, which would destroy the mailbox passwords." >&2
    exit 1
  fi
fi

if [[ -n "$ENV_ID" ]]; then
  if [[ ! "$ENV_ID" =~ ^[a-z][a-z0-9]{0,7}$ ]]; then
    echo "ENV_ID must be 1-8 lowercase letters or numbers, starting with a letter (e.g. mm)." >&2
    exit 1
  fi
  if [[ "$ENV_ID" == "www" || "$ENV_ID" == "default" || "$ENV_ID" =~ aws|amazon|cognito ]]; then
    echo "ENV_ID can't be www or default, or contain aws, amazon or cognito." >&2
    exit 1
  fi
fi

if ! aws sts get-caller-identity --query Arn --output text >/dev/null; then
  echo "AWS login not working. Run 'aws login', then try again (see README, 'Log in')." >&2
  exit 1
fi

# ---------- one-time setup ----------
if [[ "$ACTION" == "setup" ]]; then
  (
    cd setup

    # setup/ creates the bucket its own state then lives in, so read the
    # bucket, key and region literally out of backend.tf's own backend
    # block rather than recomputing them -- a second computation (here, or
    # from a sibling root's versions.tf) can silently drift from the block
    # Terraform actually uses. This can't drift: it IS the block. (Lives in
    # backend.tf, not main.tf -- see that file for why.)
    # If a prior run's trap ever failed to restore backend.tf, this sed on
    # the missing file fails under `set -e` and the script aborts here --
    # loudly, before the -z check below even runs, rather than silently
    # proceeding with no backend block. Not something to lean on instead of
    # the trap, but worth knowing it's there.
    BACKEND_BLOCK="$(sed -n '/backend "s3" {/,/^  }/p' backend.tf)"
    STATE_BUCKET="$(sed -nE 's/^[[:space:]]*bucket[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' <<<"$BACKEND_BLOCK")"
    STATE_KEY="$(sed -nE 's/^[[:space:]]*key[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' <<<"$BACKEND_BLOCK")"
    STATE_REGION="$(sed -nE 's/^[[:space:]]*region[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' <<<"$BACKEND_BLOCK")"
    if [[ -z "$STATE_BUCKET" || -z "$STATE_KEY" || -z "$STATE_REGION" ]]; then
      echo "Could not read bucket/key/region from backend.tf's backend block." >&2
      exit 1
    fi

    # Three outcomes, never two. "Migrated" and "not migrated" are the only
    # states we may act on; anything else (403, throttle, endpoint error,
    # dead credentials) must abort. Guessing "not migrated" would run the
    # bootstrap path against stale local state and -force-copy it over the
    # real thing -- sts:GetCallerIdentity above proves credentials exist,
    # not that they can read this object, so that guard doesn't cover this.
    # --region is passed explicitly: the backend pins one, the CLI profile
    # has its own, and a mismatch must be an error, not a false 404.
    if PROBE_ERR="$(aws s3api head-object --bucket "$STATE_BUCKET" --key "$STATE_KEY" \
      --region "$STATE_REGION" 2>&1 >/dev/null)"; then
      # State object exists: already migrated. Nothing to bootstrap.
      terraform init -input=false
    elif grep -qE '\(404\)|Not Found' <<<"$PROBE_ERR"; then
      # First run ever: this root's own state object doesn't exist in the
      # bucket yet. The bucket itself is a poor signal -- the same apply
      # that creates the bucket creates everything else too, so the bucket
      # exists long before this root's state is actually migrated into it.
      #
      # `-backend=false` is NOT enough here: with a `backend "s3" {}` block
      # present in config but no record of it in .terraform/terraform.tfstate,
      # Terraform treats that as a backend CHANGE and refuses `plan`/`apply`
      # outright ("Backend initialization required... use -reconfigure or
      # -migrate-state") -- `-backend=false` only skips *writing* the record,
      # it doesn't make plan/apply tolerate the mismatch. The block has to be
      # genuinely absent from config for the first apply, not just unused.
      # That's why it lives alone in backend.tf: rename it aside so this
      # root really has no backend block while it creates the bucket, put
      # it back, then migrate into the bucket it just made.
      # A missing terraform.tfstate is expected on a genuinely fresh account
      # (nothing to back up yet) and handled by the condition; a real copy
      # failure -- disk full, permissions -- is not swallowed and aborts
      # under `set -e` before anything touches state, since the whole point
      # of this line is having a backup before the migration below.
      if [[ -f terraform.tfstate ]]; then
        cp terraform.tfstate "terraform.tfstate.pre-migrate.$(date +%Y%m%d-%H%M%S)"
      fi
      # Set before the rename, not after: the trap body no-ops (nothing to
      # move back yet) until backend.tf.disabled actually exists, so setting
      # it early costs nothing but closes the window where a crash between
      # the rename and the trap could leave the file disabled with nothing
      # watching it. Cleared right after the deliberate restore below so it
      # doesn't also fire (harmlessly, since the file is back by then) on
      # the script's normal exit.
      trap 'mv -f backend.tf.disabled backend.tf 2>/dev/null || true' EXIT
      mv backend.tf backend.tf.disabled
      terraform init -input=false
      terraform apply -var-file=../settings.auto.tfvars
      mv -f backend.tf.disabled backend.tf
      trap - EXIT
      terraform init -input=false -migrate-state -force-copy
      # The leftover local terraform.tfstate is exactly what a bare local
      # init would silently prefer over the remote on a later run -- it's
      # the fuel for the clobber this whole branch exists to avoid. Move it
      # out of Terraform's search path rather than delete it: right after
      # migration the remote copy is seconds old and unverified by anything
      # but Terraform's own exit code, so the bytes stay recoverable.
      # *.tfstate.* is already gitignored, so neither copy can leak into git.
      mv -f terraform.tfstate "terraform.tfstate.migrated-$(date +%Y%m%d-%H%M%S)"
    else
      echo "Cannot tell whether setup/ state is already in s3://${STATE_BUCKET}/${STATE_KEY}:" >&2
      echo "  $PROBE_ERR" >&2
      echo "Refusing to guess -- guessing wrong overwrites real state. Fix access, then re-run." >&2
      exit 1
    fi

    # Every path above ends with either a fresh apply (bootstrap) or none
    # (already migrated), so this covers steady state. Not -auto-approve:
    # a human must see the plan before real, billable resources change.
    # -input=false stays on every init (inits must never prompt); it's
    # absent here on purpose, same as the bootstrap apply above.
    terraform apply -var-file=../settings.auto.tfvars

    # SES starts sandboxed: 200 messages a day, verified recipients only.
    # No Terraform resource covers production access (aws_sesv2_account_details
    # doesn't exist in the provider), so this stays a scripted step here
    # instead of a manual console visit. Only relevant once the mail server
    # itself is on. Must never fail the run: capture stderr instead of
    # discarding it, so a real problem (bad credentials, denied IAM, a
    # grep that came back empty) prints loudly instead of being folded into
    # the "already requested" message that only fits an actual conflict.
    if grep -qE '^\s*enable_mailserver\s*=\s*true' ../settings.auto.tfvars; then
      DOMAIN_NAME="$(grep -oE 'domain_name *= *"[^"]+"' ../settings.auto.tfvars | cut -d'"' -f2)"
      ALERT_EMAIL="$(grep -oE 'alert_email *= *"[^"]+"' ../settings.auto.tfvars | cut -d'"' -f2)"
      if [[ -z "$DOMAIN_NAME" || -z "$ALERT_EMAIL" ]]; then
        echo "WARNING: could not read domain_name/alert_email from settings.auto.tfvars -- skipped the SES production-access request." >&2
      elif SES_ERR="$(aws sesv2 put-account-details \
        --production-access-enabled \
        --mail-type TRANSACTIONAL \
        --website-url "https://${DOMAIN_NAME}" \
        --additional-contact-email-addresses "${ALERT_EMAIL}" \
        --contact-language EN 2>&1 >/dev/null)"; then
        echo ">>> SES production access requested (approval ~24h)"
      elif grep -qiE 'already|pending' <<<"$SES_ERR"; then
        echo ">>> SES production access already requested or granted"
      else
        echo "WARNING: SES production-access request failed unexpectedly:" >&2
        echo "  $SES_ERR" >&2
      fi
    fi

    echo
    echo "Next: enter these name servers in Namecheap (Custom DNS):"
    terraform output -json name_servers
  )
  exit 0
fi

if [[ ! -f backend.hcl ]]; then
  echo "backend.hcl not found. Run './infra/deploy.sh setup' first." >&2
  exit 1
fi

# ---------- pick the environment ----------
terraform init -input=false -backend-config=backend.hcl
WORKSPACE="${ENV_ID:-default}"
terraform workspace select -or-create "$WORKSPACE"
echo ">>> Environment: ${ENV_ID:-main site}"

case "$ACTION" in
  plan)
    terraform plan
    ;;
  apply)
    terraform apply
    ;;
  destroy)
    if [[ -z "$ENV_ID" ]]; then
      echo "!!! This deletes the MAIN site, every user account and all data. !!!"
      echo "Step 1 of 2: turn off deletion protection."
      terraform apply -var="protect_data=false"
      echo "Step 2 of 2: delete everything."
      terraform destroy -var="protect_data=false"
    else
      terraform destroy
      terraform workspace select default
      terraform workspace delete "$WORKSPACE"
    fi
    ;;
  *)
    echo "Unknown action '$ACTION'. Use: setup, plan, apply or destroy." >&2
    exit 1
    ;;
esac
