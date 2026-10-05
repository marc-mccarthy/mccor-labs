set -euo pipefail
cd "$(dirname "$0")"

ACTION="${1:-apply}"
ENV_ID="${ENV_ID:-}"

if [[ -z "${AWS_PROFILE:-}" ]]; then
  if [[ "$ACTION" == "publish" && -z "$ENV_ID" ]] && aws configure list-profiles 2>/dev/null | grep -qx publish; then
    AWS_PROFILE=publish
  elif aws configure list-profiles 2>/dev/null | grep -qx terraform; then
    AWS_PROFILE=terraform
  else
    AWS_PROFILE=default
  fi
fi
export AWS_PROFILE
unset TF_WORKSPACE

if [[ -f settings.auto.tfvars.tpl ]]; then
  if ! command -v op >/dev/null; then
    echo "1Password CLI (op) not found, but settings.auto.tfvars.tpl exists." >&2
    echo "Install it, or write settings.auto.tfvars by hand from the template." >&2
    exit 1
  fi
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
      terraform apply -var-file=../settings.auto.tfvars
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

    terraform apply -var-file=../settings.auto.tfvars

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
