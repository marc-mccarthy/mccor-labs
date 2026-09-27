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
    terraform init -input=false
    terraform apply -var-file=../settings.auto.tfvars
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
