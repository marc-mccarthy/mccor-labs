#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

SETTINGS="$PWD/../app.env"
SETTINGS_MISSING_MSG="Refusing to continue: deploying without settings risks applying an
empty MAILBOXES map, which would destroy the mailbox passwords."

if [[ -z "${DEPLOY_UNDER_OP:-}" ]]; then
  if ! command -v op >/dev/null; then
    echo "1Password CLI (op) not found. Settings and AWS keys live in 1Password;" >&2
    echo "app.env only holds op:// references to them. Install op and run 'op signin'." >&2
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
  case $name in TF_VAR_DELEGATION_SET_ID) continue ;; esac
  if [[ ($name == TF_VAR_DOMAIN_NAME || $name == DOMAIN_NAME) && "${ALLOW_EMPTY_DOMAIN:-}" == 1 ]]; then
    continue
  fi
  if [[ -z "${!name:-}" ]]; then
    echo "$name is empty or not set; it should come from 1Password via app.env." >&2
    if [[ $name == TF_VAR_DOMAIN_NAME ]]; then
      echo "An empty DOMAIN_NAME plans to destroy the zone and the mail server (EBS volume included)." >&2
      echo "To deploy without a domain on purpose, run with ALLOW_EMPTY_DOMAIN=1." >&2
    fi
    echo "$SETTINGS_MISSING_MSG" >&2
    exit 1
  fi
done
unset AWS_PROFILE AWS_DEFAULT_PROFILE AWS_SESSION_TOKEN TF_WORKSPACE
export AWS_ACCESS_KEY_ID="$AWS_SECRET_ID" AWS_SECRET_ACCESS_KEY="$AWS_SECRET_KEY"

ACTION="${1:-apply}"
for f in *.auto.tfvars terraform.tfvars; do
  if [[ -e "$f" ]]; then
    echo "infra/$f exists. Settings come only from 1Password via app.env;" >&2
    echo "a tfvars file would silently override them. Delete or move infra/$f." >&2
    exit 1
  fi
done

if ! aws sts get-caller-identity --query Arn --output text >/dev/null; then
  echo "AWS rejected the access keys from 1Password. Check the AWS item that" >&2
  echo "app.env points at, then try again." >&2
  exit 1
fi

terraform init -input=false -reconfigure

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
      echo "Nothing deployed here yet. Run './infra/deploy.sh apply' first." >&2
      exit 1
    fi
    for tool in op pnpm git; do
      if ! command -v "$tool" >/dev/null; then
        echo "$tool not found; publish needs it to build the site." >&2
        exit 1
      fi
    done

    BUILD_PATHS=()
    for p in app package.json pnpm-lock.yaml pnpm-workspace.yaml .mise.toml; do
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
      echo "Build env comes only from app.env via op run. Remove these app/web/.env* files first:" >&2
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
      for name in "${SETTING_NAMES[@]}"; do
        case $name in DOMAIN_NAME|NEXT_PUBLIC_*) ;; *) unset "$name" ;; esac
      done
      unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
      NEXT_PUBLIC_SITE_URL="$SITE_URL" pnpm -F web build
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
  *)
    echo "Unknown action '$ACTION'. Use: plan, apply or publish." >&2
    exit 1
    ;;
esac
