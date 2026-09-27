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
    # bucket and key literally out of setup/main.tf's own backend block
    # rather than recomputing them -- a second computation (here, or from a
    # sibling root's versions.tf) can silently drift from the block
    # Terraform actually uses. This can't drift: it IS the block.
    BACKEND_BLOCK="$(sed -n '/backend "s3" {/,/^  }/p' main.tf)"
    STATE_BUCKET="$(sed -nE 's/^[[:space:]]*bucket[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' <<<"$BACKEND_BLOCK")"
    STATE_KEY="$(sed -nE 's/^[[:space:]]*key[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' <<<"$BACKEND_BLOCK")"
    if [[ -z "$STATE_BUCKET" || -z "$STATE_KEY" ]]; then
      echo "Could not find the state bucket/key in setup/main.tf's backend block." >&2
      exit 1
    fi

    # First run ever: this root's own state object doesn't exist in the
    # bucket yet. The bucket itself is a poor signal -- the same apply that
    # creates the bucket creates everything else too, so the bucket exists
    # long before this root's state is actually migrated into it (that's
    # exactly the gap between "bucket exists" and "my state lives there").
    # Init without a backend (nothing to reach), apply so the bucket (among
    # everything else) gets created, then migrate this root's own state
    # into the bucket it just made. Once the state object exists, every
    # later run skips straight to plain init.
    if ! aws s3api head-object --bucket "$STATE_BUCKET" --key "$STATE_KEY" >/dev/null 2>&1; then
      terraform init -input=false -backend=false
      terraform apply -input=false -var-file=../settings.auto.tfvars
      terraform init -input=false -migrate-state -force-copy
    else
      terraform init -input=false
    fi

    terraform apply -input=false -var-file=../settings.auto.tfvars

    # SES starts sandboxed: 200 messages a day, verified recipients only.
    # No Terraform resource covers production access (aws_sesv2_account_details
    # doesn't exist in the provider), so this stays a scripted step here
    # instead of a manual console visit. Only relevant once the mail server
    # itself is on. Safe to re-run: a repeat request while pending or
    # already granted returns an error, which is expected, not a failure.
    if grep -qE '^\s*enable_mailserver\s*=\s*true' ../settings.auto.tfvars; then
      DOMAIN_NAME="$(grep -oE 'domain_name *= *"[^"]+"' ../settings.auto.tfvars | cut -d'"' -f2)"
      ALERT_EMAIL="$(grep -oE 'alert_email *= *"[^"]+"' ../settings.auto.tfvars | cut -d'"' -f2)"
      aws sesv2 put-account-details \
        --production-access-enabled \
        --mail-type TRANSACTIONAL \
        --website-url "https://${DOMAIN_NAME}" \
        --additional-contact-email-addresses "${ALERT_EMAIL}" \
        --contact-language EN 2>/dev/null \
        && echo ">>> SES production access requested (approval ~24h)" \
        || echo ">>> SES production access already requested or granted"
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
