#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

SETTINGS="$PWD/terraform.env"
SETTINGS_MISSING_MSG="Refusing to continue: deploying without settings risks applying an
empty mailboxes map, which would destroy the mailbox passwords."

if [[ -z "${DEPLOY_UNDER_OP:-}" ]]; then
  if ! command -v op >/dev/null; then
    echo "1Password CLI (op) not found. Settings and AWS keys live in 1Password;" >&2
    echo "infra/terraform.env only holds op:// references to them. Install op and run 'op signin'." >&2
    exit 1
  fi
  if ! op run --env-file="$SETTINGS" -- true; then
    echo "Could not read settings from 1Password. Run 'op signin' and retry." >&2
    echo "$SETTINGS_MISSING_MSG" >&2
    exit 1
  fi
  exec op run --no-masking --env-file="$SETTINGS" -- env DEPLOY_UNDER_OP=1 "$BASH" "$PWD/${0##*/}" "$@"
fi

SETTING_NAMES=()
while IFS= read -r name; do
  SETTING_NAMES+=("$name")
done < <(sed -nE 's/^([A-Za-z_][A-Za-z0-9_]*)=.*/\1/p' "$SETTINGS")
for name in "${SETTING_NAMES[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "$name is empty or not set; it should come from 1Password via infra/terraform.env." >&2
    echo "$SETTINGS_MISSING_MSG" >&2
    exit 1
  fi
done
unset AWS_PROFILE AWS_DEFAULT_PROFILE AWS_SESSION_TOKEN TF_WORKSPACE

ACTION="${1:-apply}"
ENV_ID="${ENV_ID:-}"

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

for f in *.auto.tfvars terraform.tfvars setup/*.auto.tfvars setup/terraform.tfvars; do
  if [[ -e "$f" ]]; then
    echo "infra/$f exists. Settings come only from 1Password via terraform.env;" >&2
    echo "a tfvars file would silently override them. Delete or move infra/$f." >&2
    exit 1
  fi
done

if ! aws sts get-caller-identity --query Arn --output text >/dev/null; then
  echo "AWS rejected the access keys from 1Password. Check the AWS item that" >&2
  echo "infra/terraform.env points at, then try again." >&2
  exit 1
fi

if [[ "$ACTION" == "setup" ]]; then
  (
    cd setup

    BACKEND_BLOCK="$(sed -n '/backend "s3" {/,/^  }/p' backend.tf)"
    STATE_BUCKET="$(sed -nE 's/^[[:space:]]*bucket[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' <<<"$BACKEND_BLOCK")"
    STATE_KEY="$(sed -nE 's/^[[:space:]]*key[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' <<<"$BACKEND_BLOCK")"
    STATE_REGION="$(sed -nE 's/^[[:space:]]*region[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' <<<"$BACKEND_BLOCK")"
    if [[ -z "$STATE_BUCKET" || -z "$STATE_KEY" || -z "$STATE_REGION" ]]; then
      echo "Could not read bucket/key/region from backend.tf's backend block." >&2
      exit 1
    fi

    if PROBE_ERR="$(aws s3api head-object --bucket "$STATE_BUCKET" --key "$STATE_KEY" \
      --region "$STATE_REGION" 2>&1 >/dev/null)"; then
      terraform init -input=false
    elif grep -qE '\(404\)|Not Found' <<<"$PROBE_ERR"; then
      if [[ -f terraform.tfstate ]]; then
        cp terraform.tfstate "terraform.tfstate.pre-migrate.$(date +%Y%m%d-%H%M%S)"
      fi

      trap 'mv -f backend.tf.disabled backend.tf 2>/dev/null || true' EXIT
      mv backend.tf backend.tf.disabled
      terraform init -input=false
      terraform apply
      mv -f backend.tf.disabled backend.tf
      trap - EXIT
      terraform init -input=false -migrate-state -force-copy

      mv -f terraform.tfstate "terraform.tfstate.migrated-$(date +%Y%m%d-%H%M%S)"
    else
      echo "Cannot tell whether setup/ state is already in s3://${STATE_BUCKET}/${STATE_KEY}:" >&2
      echo "  $PROBE_ERR" >&2
      echo "Refusing to guess -- guessing wrong overwrites real state. Fix access, then re-run." >&2
      exit 1
    fi

    terraform apply

    if [[ "${TF_VAR_enable_mailserver:?}" == true ]]; then
      if SES_ERR="$(aws sesv2 put-account-details \
        --production-access-enabled \
        --mail-type TRANSACTIONAL \
        --website-url "https://${TF_VAR_domain_name:?}" \
        --additional-contact-email-addresses "${TF_VAR_alert_email:?}" \
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

terraform init -input=false -backend-config=backend.hcl
WORKSPACE="${ENV_ID:-default}"
if [[ "$ACTION" == "publish" ]]; then
  terraform workspace select "$WORKSPACE"
else
  terraform workspace select -or-create "$WORKSPACE"
fi
echo ">>> Environment: ${ENV_ID:-main site}"

case "$ACTION" in
  plan)
    terraform plan
    ;;
  apply)
    terraform apply
    ;;
  publish)

    if ! SITE_BUCKET="$(terraform output -raw site_bucket)" ||
      ! DISTRIBUTION_ID="$(terraform output -raw cloudfront_distribution_id)" ||
      ! SITE_URL="$(terraform output -raw site_url)"; then
      echo "Nothing deployed here yet. Run '${ENV_ID:+ENV_ID=$ENV_ID }./infra/deploy.sh' first." >&2
      exit 1
    fi
    for tool in op pnpm git; do
      if ! command -v "$tool" >/dev/null; then
        echo "$tool not found; publish needs it to build the site." >&2
        exit 1
      fi
    done

    BUILD_PATHS=()
    for p in app package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version; do
      [[ -e "../$p" ]] && BUILD_PATHS+=("$p")
    done
    DIRTY="$(git -C .. status --porcelain --untracked-files=all -- "${BUILD_PATHS[@]}")"
    if [[ -n "$DIRTY" ]]; then
      echo "Publish builds only committed code. Commit or stash these first:" >&2
      echo "$DIRTY" >&2
      exit 1
    fi

    IGNORED_ENV="$(git -C .. ls-files --others --ignored --exclude-standard -- 'app/web/.env*')"
    if [[ -n "$IGNORED_ENV" ]]; then
      echo "Build env must come only from app/web/.env via op run. Remove these first:" >&2
      echo "$IGNORED_ENV" >&2
      exit 1
    fi

    OUT=../app/web/out
    rm -rf "${OUT:?}"

    COMMIT_SHA="$(git -C .. rev-parse --short HEAD)"
    COMMIT_SUBJECT="$(git -C .. log -1 --format=%s)"
    echo ">>> Building ${COMMIT_SHA} (${COMMIT_SUBJECT}) for ${SITE_URL}"
    (
      cd ..
      unset "${SETTING_NAMES[@]}"
      op run --env-file=app/web/.env -- \
        env NEXT_PUBLIC_SITE_URL="$SITE_URL" pnpm -F web build
    )

    STAGE="$(mktemp -d)"
    trap 'rm -rf "$STAGE"' EXIT
    cp -R "$OUT/." "$STAGE/"

    if [[ ! -f "$STAGE/index.html" || ! -f "$STAGE/404.html" ]]; then
      echo "Build output is missing index.html or 404.html; refusing to upload." >&2
      exit 1
    fi

    if ! grep -qF "Sitemap: ${SITE_URL}/sitemap.xml" "$STAGE/robots.txt" 2>/dev/null; then
      echo "Build is not for ${SITE_URL}; refusing to upload." >&2
      exit 1
    fi

    source ./publish-guard.sh
    if ! check_publish_stage "$STAGE" ..; then
      echo "Build output failed the publish guard; refusing to upload." >&2
      exit 1
    fi

    rm -rf "$STAGE/404" "$STAGE/_not-found"

    IMMUTABLE="public, max-age=31536000, immutable"
    MEDIA="public, max-age=86400, stale-while-revalidate=604800"
    REVALIDATE="public, max-age=0, s-maxage=86400, must-revalidate"
    S3="s3://${SITE_BUCKET}"
    REGION=us-east-1

    echo ">>> Uploading to ${S3}"
    aws s3 sync "$STAGE/_next/static/" "$S3/_next/static/" --region "$REGION" --no-progress \
      --cache-control "$IMMUTABLE"
    for dir in media fonts; do
      aws s3 sync "$STAGE/$dir/" "$S3/$dir/" --region "$REGION" --no-progress \
        --cache-control "$MEDIA"
    done
    aws s3 sync "$STAGE/" "$S3/" --region "$REGION" --no-progress \
      --exclude "_next/static/*" --exclude "media/*" --exclude "fonts/*" \
      --cache-control "$REVALIDATE"

    INVALIDATION_ID="$(aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" \
      --paths '/*' --query Invalidation.Id --output text)"
    echo ">>> Clearing CloudFront's cache (invalidation ${INVALIDATION_ID})"
    if aws cloudfront wait invalidation-completed \
      --distribution-id "$DISTRIBUTION_ID" --id "$INVALIDATION_ID"; then
      for dir in media fonts; do
        aws s3 sync "$STAGE/$dir/" "$S3/$dir/" --region "$REGION" --no-progress \
          --cache-control "$MEDIA" --delete
      done
      aws s3 sync "$STAGE/" "$S3/" --region "$REGION" --no-progress \
        --exclude "_next/static/*" --exclude "media/*" --exclude "fonts/*" \
        --cache-control "$REVALIDATE" --delete
      echo ">>> Live at ${SITE_URL}"
    else
      echo "WARNING: invalidation still running (or the wait failed); left the" >&2
      echo "previous build's stale files in place -- the next publish's --delete" >&2
      echo "passes will remove them." >&2
    fi
    ;;
  destroy)
    if [[ -z "$ENV_ID" ]]; then
      echo "!!! This deletes the MAIN site and every file in it, permanently. !!!"
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
    echo "Unknown action '$ACTION'. Use: setup, plan, apply, publish or destroy." >&2
    exit 1
    ;;
esac
