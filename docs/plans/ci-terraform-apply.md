# Plan: CI Terraform apply for mccor-labs (mirror of legacy-benefits-mn)

Branch: `feat/ci-terraform-apply` (from main df8e79b). Plan file: `docs/plans/ci-terraform-apply.md`. Reference: legacy-benefits-mn main 5f38168, `docs/plans/ci-terraform-apply.md`.
Persona: principal cloud architect (Terraform, AWS, GitHub Actions, Next.js static hosting).

## Goal

Merging to main runs quality, then build, then `terraform apply` through GitHub OIDC (a 1Password service account supplies the variables), then syncs the static site to S3 and invalidates CloudFront. Layout matches legacy: one root `infra/`, one state key, a plan-guard on destroys, and a laptop break-glass path.

Owner decision (latest): tear down the whole `infra/setup` stack, keep nothing, import nothing. The first CI apply builds everything from empty state.

Each task is marked OWNER, laptop (agent on the owner's machine) or CI. Each ends with a verification and a proposed commit message. Only plan-approved per-task commits are made, staging only the paths that task names, and nothing is pushed. Run every shell block in bash (zsh does not word-split `$R`-style variables, so the blocks use functions).

## Rulings

Inherited from legacy unchanged (each carries its "cost if wrong" in the legacy plan):

- Job outputs, not an artifact, carry Terraform outputs.
- `op run` sits in the build step, with no config job.
- Build before apply is safe because the site URL is `https://${domain_name}` (`infra/main.tf:6`, `local.site_urls[0]`; output at `infra/outputs.tf:2`). The deploy job refuses to sync if the built URL differs from `terraform output site_url`.
- The terraform job checks out `github.sha`, never `inputs.ref`.
- No `plan_only` input.
- No `actor_id` or `job_workflow_ref` trust conditions.
- The apply job runs on ubuntu-latest x64. Quality, build and deploy run on ubuntu-24.04-arm.
- Role session is 7200 s. Job timeout is 120 min.
- The guard is `scripts/plan-guard.sh`, called directly (mode 0755), with its fixture test in ci.yml.
- The service-account token has no expiry and is rotated by hand.
- No PR plan job and no PR AWS role.

Owner-decided:

- Ruling (owner): state bucket `mccorlabs-tfstate-150701180133`, key `terraform.tfstate`, made once with the AWS CLI and not Terraform-managed. It has versioning, SSE-S3, a full public access block, a TLS-only policy and 90-day noncurrent expiry (cost if wrong: none).
- Ruling (owner): AWS names use Terraform name `mccorlabs`. 1Password uses the repo name: vault `mccor-labs-ci`, item `mccor-labs-infra`, service account `mccor-labs-ci`. The "AWS mj" admin key stays in Development, unreachable by the service account (cost if wrong: rename later).
- Ruling (owner): the OIDC provider is owned by no repo and is only read with `data "aws_iam_openid_connect_provider"`. Never create or import it. No `removed` block, because mccor-labs never owned it.
- Ruling (owner): one shared AWS account. Nothing else is shared with legacy.
- Ruling (owner): full teardown of `infra/setup`, nothing imported or kept (cost if wrong: mailbox passwords, the SMTP key, the old EIP and its reputation, SES/DKIM reputation and the zone ID are lost. Mail data is recoverable from the 28 DLM snapshots until the owner deletes them in T8).

Deviations from legacy (mccor-labs physically differs, or a gap the reviews found):

- Ruling: the new zone is created in a laptop targeted apply (T6) with the CI role, not in the first CI apply (cost if wrong: none, same state, just earlier). Reason: the name servers must reach Namecheap before ACM and mail-server TLS can validate. Otherwise the first CI run blocks in ACM validation for the provider's 75-minute default.
- Ruling: order is new zone (T6), Namecheap cutover and registry gate (T7), then teardown (T8), then first CI apply. Route53 allows two zones with the same name. The teardown must precede the CI apply because the new mail server reuses fixed names (IAM user `mccorlabs-com-mail-relay`, SNS topic `mccorlabs-com-mail-alerts`, SSM `/mccorlabs.com/mail/*`) (cost if wrong: name-collision errors in the CI apply).
- Ruling: T8 starts when the `.com` registry serves the new NS set, not after the 48 h delegation TTL (cost if wrong: resolvers that cached the old NS set get SERVFAIL or REFUSED for up to 48 h; waiting 48 h costs a few dollars of idle EC2).
- Ruling: the teardown runs from a throwaway worktree at df8e79b with local edits and local state (cost if wrong: a bad edit makes the destroy fail at `prevent_destroy`, nothing is destroyed wrongly). `prevent_destroy` cannot be overridden by flags. The edits never reach the branch.
- Ruling: single default workspace. `ENV_ID`, `local.is_main`, the `Env` tag and per-environment hostnames are removed (cost if wrong: no per-person preview sites).
- Ruling: variable `project` becomes `name` (`TF_VAR_name`), with legacy's validation `^[a-z][a-z0-9-]*$`, max 32 (legacy `variables.tf:5`). `enable_mailserver`, `enable_email`, `mail_forward_to`, `mail_recipients` and `force_destroy` are dropped. `module "mailserver"` has no `count`. Mail forwarding is not rebuilt (cost if wrong: re-add the variable and module; a count-guarded mail server is a destroy risk when the variable is unset).
- Ruling: `modules/email` is deleted. SES identity and DKIM live in `modules/mailserver` (`infra/modules/mailserver/main.tf:26-41`), so `modules/email` is dead. `modules/publish_role` and its test are deleted, replaced by `aws_iam_role.deploy`. `.node-version` is deleted because `.mise.toml` pins node (cost if wrong: restore from git).
- Ruling: layout mirrors legacy. The `terraform` and provider blocks go in `main.tf` (`versions.tf` is deleted). The zone and records go in `dns.tf`. Single-instance resources are named `.this` (`aws_route53_zone.this`). The aws provider is `~> 6.63`, as legacy `main.tf:5` (cost if wrong: one rename).
- Ruling: the zone carries `prevent_destroy = true` from day 1, and the mail volume already has it (`modules/mailserver/main.tf:229`). The root now holds mail, SES and the budget, so an accidental destroy is far costlier than before (cost if wrong: a deliberate zone replacement needs a PR removing the line).
- Ruling: `deploy.sh` keeps `plan|apply|publish` only. The `destroy` case is deleted. Laptop `apply` runs with Development admin keys and bypasses plan-guard, which legacy has no equivalent for (cost if wrong: a destroy needs a raw `terraform destroy`; a bypassing apply is the owner's explicit break-glass).
- Ruling: the deploy role is S3 Put/Delete/ListBucket on the site bucket plus CloudFront CreateInvalidation and GetInvalidation. Legacy lacks GetInvalidation, but `wait invalidation-completed` needs it (cost if wrong: one policy edit).
- Ruling: Terraform outputs reach `GITHUB_OUTPUT` with `terraform output -raw <key>` per key. Sensitive `mailbox_passwords` is never read in CI (cost if wrong: a password leak into logs).
- Ruling: the sync uses mccor's three cache tiers (`infra/deploy.sh:215-243`). First pass without `--delete`, then invalidate and wait, then a `--delete` pass for the page tier. CI never deletes under `media/` or `fonts/`, because media is untracked and a clean checkout lacks it (cost if wrong: no imagery until a laptop `deploy.sh publish` or committed media).
- Ruling: the publish guard runs in the CI build job on `app/web/out` (`infra/publish-guard.sh`, as `deploy.sh:207-211` does). `rejected-media/` is not tracked (0 tracked files match), so its name denylist is blind in CI. The extension, dotfile, symlink and git-ignored rules still apply (cost if wrong: a rejected media file with an allowed extension ships; track `rejected-media/` to close it).
- Ruling: the destroy allowlist starts empty and stays empty. State is fresh, so the first plan has creates only. Guard gaps accepted, since the script stays byte-identical to legacy. In-place edits of `aws_iam_role.terraform`'s trust policy pass the guard. A malformed plan JSON fails open. Editing `alert_email` or `admin_mailbox` in 1Password plans an instance replace (`user_data_replace_on_change`, `modules/mailserver/main.tf:252`) and blocks every deploy until a PR adds `module.mailserver.aws_instance.mail` to the allowlist (cost if wrong: red deploys until the allowlist PR lands). Lockout recovery is laptop `./infra/deploy.sh apply`.
- Ruling: trust is not enforced by GitHub config. Branch protection and rulesets return 403 (needs GitHub Pro), so anyone with push access to main gets an AdministratorAccess session, and `OP_SERVICE_ACCOUNT_TOKEN` is a repo secret readable by same-repo workflows. Mitigation: ci.yml never uses the secret, and the vault item holds non-secret config only. Never add a secret to `mccor-labs-ci` (cost if wrong: repo compromise reads the vault and assumes Admin).
- Ruling: the shared account means `mccorlabs-github-terraform` (Admin) can read legacy's state and buckets and vice versa, and the new state holds plaintext mailbox and SMTP passwords. Accepted as the owner's one-account choice (cost if wrong: cross-repo blast radius; follow-up is an explicit-Deny policy on foreign prefixes).
- Ruling: the plan summary (`GITHUB_STEP_SUMMARY`) shows `alert_email` and mailbox names. Secrets are `(sensitive value)` or `(known after apply)` (cost if wrong: contact data in run logs).
- Ruling: Playwright is Chromium only. The `firefox` project becomes `chromium`. e2e installs `chromium chrome` because `budgets.spec.ts:9` uses `channel: 'chrome'`. Budget thresholds may be flaky on shared runners (cost if wrong: re-run, then drop the `budgets` project from CI).
- Ruling: no new root `lint` or `typecheck` scripts. CI calls `pnpm -F web ...`, and e2e builds with `pnpm build:raw` because `pnpm build` wraps `op run` (cost if wrong: none).
- Ruling: `infra/tests/publish-guard.test.sh` runs in ci.yml. `terraform test` for the `.tftest.hcl` files is not in CI (cost if wrong: module tests go unrun).
- Ruling: lefthook copies legacy's four terraform commands (`terraform-fmt`, `terraform-fmt-check`, `terraform-validate`, `tflint`). It adds no guard-test hooks, because CI runs them (cost if wrong: guard-test failures show up only in CI).
- Ruling: region stays the literal `us-east-1` in providers and workflows. The item still has a `region` field for `AWS_REGION` in `terraform.env`, as legacy does (cost if wrong: one variable).
- Ruling: the SES production-access request (`deploy.sh:103-117`) goes with `setup`. It is account-level and survives (cost if wrong: run `aws sesv2 put-account-details` by hand).
- Ruling: trivy ignores are scoped to the module that needs them, not `**/main.tf` (cost if wrong: CI red until the path glob is fixed).
- Ruling (owner): the parked api/auth/database blocks in `main.tf` and `outputs.tf` and `modules/{auth,database,api}` are deleted (cost if wrong: restore from git). Review: `docs/findings/2026-10-05-parked-backend-modules-review.md`.

## Costs and capacity

New resources: one EC2 mail instance (`instance_type` from the item), its EBS volume and DLM snapshots, one EIP, one Route53 zone (about $0.50/month), a CloudFront distribution, the budget and SES. Teardown first frees the old EIP, so the Elastic IP quota is checked in T10.

## Phase 0: owner bootstrap

### T1 OWNER: commit the four dirty files

`README.md`, `infra/deploy.sh`, `infra/outputs.tf`, `infra/terraform.env`. Verify: `git status --short` prints nothing. Line numbers for `deploy.sh` below refer to the file after this commit.

### T2 OWNER: state bucket (AWS CLI, admin key)

Runs before T3 because `infra/terraform.env` still points at the Development item until T4 rewrites it.

```
r() { op run --env-file=infra/terraform.env -- "$@"; }
a() { r env -u AWS_PROFILE aws "$@"; }
B=mccorlabs-tfstate-150701180133
a s3api create-bucket --bucket $B --region us-east-1
a s3api put-bucket-versioning --bucket $B --versioning-configuration Status=Enabled
a s3api put-bucket-encryption --bucket $B --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'
a s3api put-public-access-block --bucket $B --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
a s3api put-bucket-policy --bucket $B --policy '{"Version":"2012-10-17","Statement":[{"Sid":"DenyInsecureTransport","Effect":"Deny","Principal":"*","Action":"s3:*","Resource":["arn:aws:s3:::mccorlabs-tfstate-150701180133","arn:aws:s3:::mccorlabs-tfstate-150701180133/*"],"Condition":{"Bool":{"aws:SecureTransport":"false"}}}]}'
a s3api put-bucket-lifecycle-configuration --bucket $B --lifecycle-configuration '{"Rules":[{"ID":"expire-old-state-versions","Status":"Enabled","Filter":{},"NoncurrentVersionExpiration":{"NoncurrentDays":90}}]}'
```

Verify: `a s3api get-bucket-versioning --bucket $B` gives `Enabled`. `get-bucket-encryption`, `get-public-access-block`, `get-bucket-policy` and `get-bucket-lifecycle-configuration` each return the settings above.

### T3 OWNER: 1Password and GitHub secret

`op item move` creates the item under a new id, so edit by the id read back from the new vault. Until T4 rewrites `terraform.env`, `op run` with it fails.

```
op vault create mccor-labs-ci
op item move qtxqnkc35hhbcnufogpx6vsd74 --current-vault Development --destination-vault mccor-labs-ci
id=$(op item list --vault mccor-labs-ci --format json | jq -r '.[0].id')
op item edit "$id" --vault mccor-labs-ci --title mccor-labs-infra \
  'name[text]=mccorlabs' 'region[text]=us-east-1' 'project[delete]' 'enable_mailserver[delete]' \
  'github_subject_prefix[text]=repo:marc-mccarthy@40575970/mccor-labs@1389744917' \
  "booking_url[text]=$(op read "$(sed -n 's/^NEXT_PUBLIC_BOOKING_URL=//p' app/web/.env)")"
op item get "$id" --vault mccor-labs-ci --format json | jq -r '.fields[].label'
tok=$(op service-account create mccor-labs-ci --vault mccor-labs-ci:read_items --raw)
printf %s "$tok" | gh secret set OP_SERVICE_ACCOUNT_TOKEN --repo marc-mccarthy/mccor-labs
OP_SERVICE_ACCOUNT_TOKEN="$tok" op vault list
OP_SERVICE_ACCOUNT_TOKEN="$tok" op read op://mccor-labs-ci/mccor-labs-infra/domain_name
OP_SERVICE_ACCOUNT_TOKEN="$tok" op read op://Development/26uakebwqlfwhajd3ba3mpb34y/region; unset tok
```

Expected field labels: `name, region, domain_name, alert_email, monthly_budget_usd, mailboxes, admin_mailbox, instance_type, mail_volume_gb, github_subject_prefix, booking_url`. Delete any extra label, because the vault must hold no secret. `op vault list` shows exactly one vault. The domain read prints the domain. The Development read fails with an access error. `gh secret list --repo marc-mccarthy/mccor-labs` shows `OP_SERVICE_ACCOUNT_TOKEN`. `op item list --vault Development` no longer shows the moved item. If it still does, ask before deleting it.
If `gh secret set` fails after the token is printed, delete the service account and recreate it, since the token shows once. If the CLI cannot create a service account on this plan, use the web UI (UNVERIFIED).

## Phase 1: code (laptop, on the branch)

### T4 Tooling, backend, single-root restructure

Run `mise install` after writing `.mise.toml` (terraform is not on PATH yet).
Files:

- Create: `.mise.toml`, `infra/backend.tf`, `infra/iam.tf`, `infra/dns.tf`, `infra/.tflint.hcl`, `infra/build.env`, `.trivyignore.yaml`.
- Edit: `infra/main.tf`, `infra/variables.tf`, `infra/outputs.tf`, `infra/terraform.env`, `package.json` (`packageManager` to `pnpm@12.9.1`), `pnpm-lock.yaml`, `.gitignore` (add `*.tfplan`, `tfplan`), `infra/.terraform.lock.hcl`.
- Delete (`git rm -r`; plan approval is the owner's removal ask): `infra/setup/`, `infra/backend.hcl`, `infra/versions.tf`, `infra/modules/publish_role/`, `infra/modules/email/`, `.node-version`.

Before deleting `infra/setup/`, list its resource blocks (`infra/setup/main.tf:147-250`: state bucket, zone, budget, `module.email`, `module.mailserver`, `local_file.backend`) and confirm each is either declared in the new root or deliberately dropped. Everything else lives in `modules/mailserver`.

`.mise.toml`

```
[tools]
terraform = "1.16.1"
tflint = "0.64.0"
trivy = "0.74.0"
node = "24"
pnpm = "12.9.1"
```

`infra/backend.tf`

```
terraform {
  backend "s3" {
    bucket       = "mccorlabs-tfstate-150701180133"
    key          = "terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}
```

`infra/.tflint.hcl`

```
plugin "terraform" {
  enabled = true
  preset  = "recommended"
}

plugin "aws" {
  enabled = true
  version = "0.44.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}
```

`infra/main.tf` (provider side): `required_version = "~> 1.16"`, aws `~> 6.63`, random `~> 3.6`, plus `archive` or `local` only if `terraform init` demands them. Provider default tags: `Project = var.name`, `ManagedBy = "terraform"`. No `Env` tag. The rest of `main.tf`:

- `locals`: `hostnames = [var.domain_name, "www.${var.domain_name}"]`, `site_urls = [for h in local.hostnames : "https://${h}"]`.
- `data "aws_caller_identity" "current" {}` and `data "aws_region" "current" {}`.
- `aws_budgets_budget.monthly`, copied from `infra/setup/main.tf:193-217` with `var.name`.
- `module "mailserver"`, copied from `infra/setup/main.tf:228-239`, without `count`.
- `module "site"` (`name = var.name`, `force_destroy = !var.protect_data`) and `module "certificate"`.

`infra/dns.tf`: `aws_route53_zone.this` (`name = var.domain_name`, comment `Managed by Terraform`, `lifecycle { prevent_destroy = true }`, no `force_destroy`). It replaces the old `data "aws_route53_zone"`. `aws_route53_record.site` and the certificate module use `aws_route53_zone.this.zone_id`. Remove `module "publish_role"` and the `check` and `local_file` blocks.

`infra/variables.tf`:

- `name` with legacy's validation. Move `domain_name`, `alert_email`, `mailboxes`, `admin_mailbox` (validations: non-empty map, key present), `instance_type` and `mail_volume_gb` from `infra/setup/main.tf`, minus `enable_*` conditions. Keep `monthly_budget_usd` and `protect_data`.
- Add `github_subject_prefix` (string) with validation `can(regex("^repo:[^/]+@[0-9]+/[^/]+@[0-9]+$", var.github_subject_prefix))`.
- Remove `project`, the `enable_*` variables, `mail_forward_to`, `mail_recipients` and `force_destroy`.

`infra/outputs.tf`: keep `site_url`, `site_bucket`, `cloudfront_distribution_id`. Add `region` (`data.aws_region.current.region`), `deploy_role_arn` (replacing `publish_role_arn`) and `name_servers`. Add the mail outputs `mail_server`, `mail_addresses`, `mail_client_settings`, `mail_server_ip`, `mail_instance_id` and `alerts_topic_arn`, each as `module.mailserver.<output>` with no ternary. Add `mailbox_passwords` (`module.mailserver.passwords`, `sensitive = true`).

`infra/iam.tf`

```
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "github_main_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["${var.github_subject_prefix}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "deploy" {
  name               = "${var.name}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_main_assume.json
}

data "aws_iam_policy_document" "deploy" {
  statement {
    actions   = ["s3:PutObject", "s3:DeleteObject"]
    resources = ["arn:aws:s3:::${module.site.bucket_name}/*"]
  }
  statement {
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::${module.site.bucket_name}"]
  }
  statement {
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = ["arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${module.site.distribution_id}"]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "${var.name}-github-deploy"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}

resource "aws_iam_role" "terraform" {
  name                 = "${var.name}-github-terraform"
  assume_role_policy   = data.aws_iam_policy_document.github_main_assume.json
  max_session_duration = 7200
}

resource "aws_iam_role_policy_attachment" "terraform_admin" {
  role       = aws_iam_role.terraform.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
```

`infra/terraform.env`: every value is `op://mccor-labs-ci/mccor-labs-infra/<field>`, quoted like legacy. Variables: `TF_VAR_name`, `TF_VAR_domain_name`, `TF_VAR_alert_email`, `TF_VAR_monthly_budget_usd`, `TF_VAR_mailboxes`, `TF_VAR_admin_mailbox`, `TF_VAR_instance_type`, `TF_VAR_mail_volume_gb` and `TF_VAR_github_subject_prefix`, each pointing at the field of the same name. Add `AWS_REGION` pointing at the item's `region` field, as legacy does. `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` stay at `op://Development/26uakebwqlfwhajd3ba3mpb34y/username` and `/credential`.

`infra/build.env`

```
DOMAIN_NAME="op://mccor-labs-ci/mccor-labs-infra/domain_name"
NEXT_PUBLIC_BOOKING_URL="op://mccor-labs-ci/mccor-labs-infra/booking_url"
```

`.trivyignore.yaml` (IDs are predictions and the path form is UNVERIFIED. After the first trivy run, delete IDs it does not report and add path-scoped entries for any HIGH or CRITICAL it reports in the parked modules.)

```
misconfigurations:
  - id: AVD-AWS-0011
    paths: ["**/modules/static_site/**"]
    statement: A WAF on CloudFront is accepted as a cost trade-off for a static brochure site.
  - id: AVD-AWS-0132
    paths: ["**/modules/static_site/**"]
    statement: The site bucket holds public site files; default SSE-S3 applies and a customer-managed KMS key adds cost without benefit.
  - id: AVD-AWS-0107
    paths: ["**/modules/mailserver/**"]
    statement: The mail server must accept SMTP, submission and IMAPS from the internet.
  - id: AVD-AWS-0104
    paths: ["**/modules/mailserver/**"]
    statement: The mail server needs unrestricted egress for delivery, package updates and certificate issuance.
  - id: AVD-AWS-0027
    paths: ["**/modules/mailserver/**"]
    statement: The mail volume uses the default AWS-managed EBS key; a customer-managed key adds cost without benefit.
  - id: AVD-AWS-0136
    paths: ["**/modules/mailserver/**"]
    statement: The alert topic carries alarm text only; the default SNS key applies.
  - id: AVD-AWS-0178
    paths: ["**/modules/mailserver/**"]
    statement: The mail VPC holds one instance; flow logs are accepted as a cost trade-off.
```

Verify (laptop):

```
terraform fmt -check -recursive infra
terraform -chdir=infra init -backend=false -input=false && terraform -chdir=infra validate
terraform -chdir=infra providers lock -platform=darwin_arm64 -platform=linux_amd64
tflint --chdir=infra --init && tflint --chdir=infra
trivy config --ignorefile .trivyignore.yaml --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 infra
op run --env-file=infra/terraform.env -- sh -c 'test -n "$TF_VAR_name" && test -n "$TF_VAR_github_subject_prefix" && test -n "$AWS_REGION"'
op run --env-file=infra/build.env -- sh -c 'test -n "$DOMAIN_NAME" && test -n "$NEXT_PUBLIC_BOOKING_URL"'
pnpm install --frozen-lockfile
```

Expected: each exits 0. Reconcile findings by fixing code, not by weakening tflint. Commit: `feat(infra): single root stack with CI roles and S3 backend`.

### T5 plan-guard, workflows, deploy.sh, lefthook, Playwright

Files: create `scripts/plan-guard.sh`, `scripts/plan-guard.test.sh`, `infra/destroy-allowlist.txt` (zero bytes, one address per line, no comments), `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/dependabot.yml`. Edit `lefthook.yml`, `app/web/playwright.config.ts`, `infra/deploy.sh`.

Both scripts are byte-identical copies:

```
for f in scripts/plan-guard.sh scripts/plan-guard.test.sh; do git -C /Users/mj/repos/legacy-benefits-mn show 5f38168:$f >$f; chmod 755 $f; done
```

`plan-guard.sh` (legacy, 11 lines) lists addresses with action `delete` (so replaces too) and fails with `::error::` when any are outside the allowlist. The test has four fixtures: delete outside, delete inside, replace outside, empty plan.

`.github/dependabot.yml`

```
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

`.github/workflows/ci.yml`

```
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

env:
  NODE_VERSION: "24"

jobs:
  quality:
    name: Lint, types, unit tests
    runs-on: ubuntu-latest
    env:
      NEXT_PUBLIC_SITE_URL: http://localhost:3000
      NEXT_PUBLIC_BOOKING_URL: https://booking.example.com/ci
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
      - uses: pnpm/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm -F web lint
      - run: pnpm format:check
      - run: pnpm -F web exec tsc --noEmit
      - run: pnpm -F web test:run

  e2e:
    name: End-to-end, accessibility, budgets
    runs-on: ubuntu-latest
    env:
      NEXT_PUBLIC_SITE_URL: http://localhost:4321
      NEXT_PUBLIC_BOOKING_URL: https://booking.example.com/ci
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
      - uses: pnpm/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm -F web exec playwright install --with-deps chromium chrome
      - run: pnpm build:raw
      - run: pnpm -F web test:e2e
      - uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a
        if: failure()
        with:
          name: playwright-report
          path: |
            app/web/playwright-report/
            app/web/test-results/
          retention-days: 7

  terraform:
    name: Terraform validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
      - uses: hashicorp/setup-terraform@b9cd54a3c349d3f38e8881555d616ced269862dd
        with:
          terraform_version: "1.16.1"
      - name: Format check
        run: terraform fmt -check -recursive infra
      - name: Plan guard test
        run: bash scripts/plan-guard.test.sh
      - name: Publish guard test
        run: bash infra/tests/publish-guard.test.sh
      - name: Init and validate
        run: |
          terraform -chdir=infra init -backend=false -input=false
          terraform -chdir=infra validate
      - uses: terraform-linters/setup-tflint@6ffdbaa3be476b3431f7275c26966ef32ff60337
      - name: Lint
        env:
          GITHUB_TOKEN: ${{ github.token }}
        run: |
          tflint --chdir=infra --init
          tflint --chdir=infra
      - name: Scan infra for misconfiguration
        uses: aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25
        with:
          scan-type: config
          scan-ref: infra
          trivyignores: .trivyignore.yaml
          exit-code: "1"
          severity: "HIGH,CRITICAL"
          ignore-unfixed: true
```

`.github/workflows/deploy.yml`

````
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      ref:
        description: Full 40-character commit SHA to redeploy
        type: string
        default: ""

concurrency:
  group: ${{ github.workflow }}-deploy
  cancel-in-progress: false

permissions:
  contents: read

env:
  AWS_REGION: us-east-1

jobs:
  quality:
    runs-on: ubuntu-24.04-arm
    permissions:
      contents: read
    env:
      NEXT_PUBLIC_SITE_URL: http://localhost:3000
      NEXT_PUBLIC_BOOKING_URL: https://booking.example.com/ci
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
        with:
          ref: ${{ inputs.ref || github.sha }}
          fetch-depth: 0
      - name: Require commit on main
        run: |
          set -euo pipefail
          git fetch --no-tags origin main
          if ! git merge-base --is-ancestor HEAD FETCH_HEAD; then
            echo "::error::$(git rev-parse HEAD) is not an ancestor of main; refusing to deploy" >&2
            exit 1
          fi
      - uses: pnpm/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020
        with:
          node-version: "24"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm -F web lint
      - run: pnpm -F web exec tsc --noEmit
      - run: pnpm -F web test:run

  build:
    needs: quality
    runs-on: ubuntu-24.04-arm
    permissions:
      contents: read
    outputs:
      site_url: ${{ steps.build.outputs.site_url }}
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
        with:
          ref: ${{ inputs.ref || github.sha }}
          fetch-depth: 0
      - name: Require commit on main
        run: |
          set -euo pipefail
          git fetch --no-tags origin main
          if ! git merge-base --is-ancestor HEAD FETCH_HEAD; then
            echo "::error::$(git rev-parse HEAD) is not an ancestor of main; refusing to deploy" >&2
            exit 1
          fi
      - uses: pnpm/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020
        with:
          node-version: "24"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: 1password/install-cli-action@1a3160d5e9de1ae0803eaa08a88746f5ae3daa50
      - name: Build
        id: build
        env:
          NEXT_TELEMETRY_DISABLED: "1"
          OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
        run: |
          set -euo pipefail
          op run --no-masking --env-file=infra/build.env -- env -u OP_SERVICE_ACCOUNT_TOKEN bash -c '
            set -euo pipefail
            test -n "$DOMAIN_NAME"
            export NEXT_PUBLIC_SITE_URL="https://$DOMAIN_NAME"
            echo "site_url=$NEXT_PUBLIC_SITE_URL" >>"$GITHUB_OUTPUT"
            exec pnpm build:raw'
      - name: Publish guard
        run: |
          set -euo pipefail
          source infra/publish-guard.sh
          check_publish_stage app/web/out .
      - uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a
        with:
          name: site
          path: app/web/out
          if-no-files-found: error
          retention-days: 1

  terraform:
    needs: build
    runs-on: ubuntu-latest
    timeout-minutes: 120
    permissions:
      contents: read
      id-token: write
    env:
      TF_IN_AUTOMATION: "true"
      TF_INPUT: "0"
    outputs:
      region: ${{ steps.out.outputs.region }}
      site_url: ${{ steps.out.outputs.site_url }}
      site_bucket: ${{ steps.out.outputs.site_bucket }}
      cloudfront_distribution_id: ${{ steps.out.outputs.cloudfront_distribution_id }}
      deploy_role_arn: ${{ steps.out.outputs.deploy_role_arn }}
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
      - uses: hashicorp/setup-terraform@b9cd54a3c349d3f38e8881555d616ced269862dd
        with:
          terraform_version: "1.16.1"
          terraform_wrapper: false
      - uses: 1password/install-cli-action@1a3160d5e9de1ae0803eaa08a88746f5ae3daa50
      - uses: aws-actions/configure-aws-credentials@e1253824e5c10ff9df46874f81ed3ec929e19cfd
        with:
          role-to-assume: arn:aws:iam::150701180133:role/mccorlabs-github-terraform
          aws-region: ${{ env.AWS_REGION }}
          role-duration-seconds: 7200
      - run: terraform -chdir=infra init
      - name: Plan
        env:
          OP_SERVICE_ACCOUNT_TOKEN: ${{ secrets.OP_SERVICE_ACCOUNT_TOKEN }}
        run: |
          set -euo pipefail
          grep '^TF_VAR_' infra/terraform.env >"$RUNNER_TEMP/tf.env"
          op run --no-masking --env-file="$RUNNER_TEMP/tf.env" -- env -u OP_SERVICE_ACCOUNT_TOKEN \
            terraform -chdir=infra plan -lock-timeout=10m -out="$RUNNER_TEMP/tfplan"
      - name: Plan summary
        run: |
          {
            echo '```'
            terraform -chdir=infra show -no-color "$RUNNER_TEMP/tfplan"
            echo '```'
          } >>"$GITHUB_STEP_SUMMARY"
      - name: Guard
        run: |
          set -euo pipefail
          terraform -chdir=infra show -json "$RUNNER_TEMP/tfplan" | scripts/plan-guard.sh infra/destroy-allowlist.txt
      - name: Apply
        run: terraform -chdir=infra apply -lock-timeout=10m "$RUNNER_TEMP/tfplan"
      - name: Outputs
        id: out
        run: |
          set -euo pipefail
          for k in region site_url site_bucket cloudfront_distribution_id deploy_role_arn; do
            v=$(terraform -chdir=infra output -raw "$k")
            test -n "$v"
            echo "$k=$v" >>"$GITHUB_OUTPUT"
          done

  deploy:
    needs: [build, terraform]
    runs-on: ubuntu-24.04-arm
    permissions:
      contents: read
      id-token: write
    env:
      BUCKET: ${{ needs.terraform.outputs.site_bucket }}
      DIST: ${{ needs.terraform.outputs.cloudfront_distribution_id }}
      SITE: ${{ needs.terraform.outputs.site_url }}
    steps:
      - name: Check site URL
        env:
          BUILT: ${{ needs.build.outputs.site_url }}
          APPLIED: ${{ needs.terraform.outputs.site_url }}
        run: test "$BUILT" = "$APPLIED"
      - uses: aws-actions/configure-aws-credentials@e1253824e5c10ff9df46874f81ed3ec929e19cfd
        with:
          role-to-assume: ${{ needs.terraform.outputs.deploy_role_arn }}
          aws-region: ${{ env.AWS_REGION }}
      - uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c
        with:
          name: site
          path: out
      - name: Prepare site
        run: |
          set -euo pipefail
          test -f out/index.html
          test -f out/404.html
          grep -qF "Sitemap: $SITE/sitemap.xml" out/robots.txt
          rm -rf out/404 out/_not-found
      - name: Sync static site
        run: |
          set -euo pipefail
          IMMUTABLE="public, max-age=31536000, immutable"
          MEDIA="public, max-age=86400, stale-while-revalidate=604800"
          REVALIDATE="public, max-age=0, s-maxage=86400, must-revalidate"
          aws s3 sync out/_next/static "s3://$BUCKET/_next/static" --no-progress --cache-control "$IMMUTABLE"
          for dir in media fonts; do
            if [ -d "out/$dir" ]; then
              aws s3 sync "out/$dir" "s3://$BUCKET/$dir" --no-progress --cache-control "$MEDIA"
            fi
          done
          aws s3 sync out/ "s3://$BUCKET/" --no-progress \
            --exclude '_next/static/*' --exclude 'media/*' --exclude 'fonts/*' --cache-control "$REVALIDATE"
      - name: Invalidate
        run: |
          set -euo pipefail
          id=$(aws cloudfront create-invalidation --distribution-id "$DIST" --paths '/*' --query Invalidation.Id --output text)
          aws cloudfront wait invalidation-completed --distribution-id "$DIST" --id "$id"
      - name: Remove stale files
        run: |
          aws s3 sync out/ "s3://$BUCKET/" --no-progress --delete \
            --exclude '_next/static/*' --exclude 'media/*' --exclude 'fonts/*' \
            --cache-control "public, max-age=0, s-maxage=86400, must-revalidate"
      - name: Verify serving
        run: |
          set -euo pipefail
          code=000
          for i in $(seq 1 30); do
            code=$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "$SITE/" || echo 000)
            test "$code" = 200 && break
            sleep 10
          done
          test "$code" = 200 || { echo "::error::$SITE returned $code" >&2; exit 1; }
          curl -fsS --max-time 20 "$SITE/robots.txt" | grep -qF "Sitemap: $SITE/sitemap.xml"
````

`lefthook.yml`: copy legacy's `terraform-fmt`, `terraform-fmt-check`, `terraform-validate` and `tflint` entries from `git -C /Users/mj/repos/legacy-benefits-mn show 5f38168:lefthook.yml`. Place them in the same hook sections legacy uses, keeping this repo's existing `PATH=$HOME/.local/share/mise/shims:$PATH` prefix.

`app/web/playwright.config.ts`: project `firefox` becomes `{ name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /budgets\.spec\.ts/ }`. `budgets` gets `dependencies: ['chromium']`.

`infra/deploy.sh` (break-glass, one stack):

- Delete the ENV_ID validation (`:37-48`). Drop `setup/*.auto.tfvars setup/terraform.tfvars` from the glob (`:50`).
- Delete the `setup` block (`:64-124`) and the `backend.hcl` check (`:126-129`).
- `:131` becomes `terraform init -input=false -reconfigure`. Delete the workspace lines (`:132-138`).
- `publish` keeps its gates, build and tiered sync unchanged.
- Delete the `destroy` case. The usage message lists `plan, apply or publish`.
- The settings loop and `terraform.env` handling are unchanged.

Verify:

```
bash scripts/plan-guard.test.sh && bash infra/tests/publish-guard.test.sh
ruby -ryaml -e 'ARGV.each{|f| YAML.load_file(f)}' .github/workflows/ci.yml .github/workflows/deploy.yml .github/dependabot.yml
grep -c 'vars\.' .github/workflows/*.yml
grep -hE 'uses: ' .github/workflows/*.yml | grep -vcE '@[0-9a-f]{40}$'
bash -n infra/deploy.sh
docker run --rm -v "$PWD":/r -w /r rhysd/actionlint:latest
diff /Users/mj/repos/legacy-benefits-mn/.github/workflows/deploy.yml .github/workflows/deploy.yml
pnpm -F web exec tsc --noEmit && pnpm -F web test:run && pnpm build:raw && pnpm -F web test:e2e
```

Expected: both guard tests print PASS, YAML loads, `grep -c vars\.` prints 0 per file, the non-SHA `uses` count is 0, and `bash -n` and actionlint are silent. Every line of the legacy diff maps to a Ruling above. tsc, unit tests, build and e2e exit 0. Without the untracked media some specs may fail (UNVERIFIED), and the PR CI run in T11 settles it. Commit: `feat(ci): add CI and deploy workflows, guard and break-glass deploy`.

## Phase 2: live

### T6 laptop: initialise the new backend, create the zone and CI role

```
r() { op run --no-masking --env-file=infra/terraform.env -- "$@"; }
a() { r env -u AWS_PROFILE aws "$@"; }
r terraform -chdir=infra init -reconfigure
r terraform -chdir=infra plan -target=aws_route53_zone.this -target=aws_iam_role.terraform -target=aws_iam_role_policy_attachment.terraform_admin -out=/private/tmp/claude-501/-Users-mj-repos-mccor-labs/33445f69-8b01-4469-a6a2-1798d41b0f42/scratchpad/t6.tfplan
r terraform -chdir=infra apply /private/tmp/claude-501/-Users-mj-repos-mccor-labs/33445f69-8b01-4469-a6a2-1798d41b0f42/scratchpad/t6.tfplan
r terraform -chdir=infra output -json name_servers
```

`-reconfigure` is required because `infra/.terraform` still records the old backend (`mccorlabs-com-tfstate`); never `-migrate-state`. Verify: the plan shows exactly 3 creates. `a iam get-role --role-name mccorlabs-github-terraform --query 'Role.[MaxSessionDuration,AssumeRolePolicyDocument.Statement[0].Condition.StringEquals]'` shows 7200 and the subject `repo:marc-mccarthy@40575970/mccor-labs@1389744917:ref:refs/heads/main`. `a iam list-attached-role-policies --role-name mccorlabs-github-terraform` shows AdministratorAccess. `s3://mccorlabs-tfstate-150701180133/terraform.tfstate` exists.

### T7 OWNER: Namecheap cutover

Enter the four name servers from T6 in Namecheap as Custom DNS. Gate for T8: `dig +norec NS mccorlabs.com @a.gtld-servers.net +short` returns exactly the four new servers (the registry's answer, not one resolver's cache). From this point the new zone has no MX and no apex A record, so senders get permanent failures and mail to the domain bounces rather than defers. This lasts until the first CI apply finishes (PR green, merge, then 30 to 60 minutes). The owner accepted it. Resolvers that cached the old NS set can see SERVFAIL for up to 48 h after T8.

### T8 laptop: teardown of the old `infra/setup` stack

Why this is safe in a shared account: Terraform destroys only addresses in its own state, and the setup state holds only `mccorlabs` and `mccorlabs-com-*` resources (state-fold review: zero strings matching "legacy"). Legacy's SES identity (`legacybenefitsmn.com`), zone `Z00034881U2WSJ1QDCQ8`, roles `legacybenefitsgroup-*`, CloudFront `E2WI3DZRX9HXSA` and the OIDC provider are not in it. The checks below confirm this before and after.

```
W=/Users/mj/repos/mccor-labs-teardown
r() { op run --no-masking --env-file=/Users/mj/repos/mccor-labs/infra/terraform.env -- "$@"; }
a() { r env -u AWS_PROFILE aws "$@"; }
s() { r terraform -chdir="$W/infra/setup" "$@"; }
export TF_VAR_project=mccorlabs TF_VAR_enable_mailserver=true TF_VAR_force_destroy=true
git worktree add --detach "$W" df8e79b
s init -input=false
rm "$W/infra/setup/backend.tf"
s init -input=false -migrate-state -force-copy
sed -i '' '/prevent_destroy = true/d' "$W/infra/setup/main.tf" "$W/infra/modules/mailserver/main.tf"
sed -i '' '/^resource "aws_volume_attachment" "mail" {/a\
  force_detach = true
' "$W/infra/modules/mailserver/main.tf"
s plan -input=false -target=aws_s3_bucket.state -target=aws_route53_zone.main -target='module.mailserver[0].aws_volume_attachment.mail' -out="$W/pre.tfplan"
s apply "$W/pre.tfplan"
s plan -destroy -input=false -out="$W/destroy.tfplan"
```

Local state replaces the S3 backend so the destroy can delete the bucket that held the state. The pre-apply stores `force_destroy = true` (bucket, zone) and `force_detach = true` (the mounted mail volume, whose detach would otherwise hang) in state. Read `pre.tfplan` first. It must show only in-place changes for those three resources. Whether `force_detach` is an in-place change is UNVERIFIED. The `TF_VAR_project` and `TF_VAR_enable_mailserver` overrides are needed because T3 renamed and deleted those fields. Whether setup needs any other variable is UNVERIFIED, and `-input=false` makes a missing one fail loudly.

Checks before destroy (read-only):

```
s state list | grep -Ev '(^|\.)data\.' | sort >"$W/state.txt"
s show -json "$W/destroy.tfplan" | jq -r '.resource_changes[] | select(.change.actions==["delete"]) | .address' | sort >"$W/del.txt"
diff "$W/state.txt" "$W/del.txt"
s state pull >"$W/old.tfstate"
jq -r '.resources[] | select(.type=="aws_route53_zone") | .instances[].attributes.zone_id' "$W/old.tfstate"
jq '[.. | strings | select(test("legacy";"i"))] | length' "$W/old.tfstate"
jq -r '[.. | strings | select(startswith("arn:") and (contains("mccorlabs")|not) and (startswith("arn:aws:iam::aws:policy/")|not))] | unique[]' "$W/old.tfstate"
```

Expected: the diff is empty (module data sources are filtered). The zone ID is `Z07613715V1FIF3QFWDD`. The legacy count is 0. The last command prints nothing, or only the account root or AWS service ARNs. Any legacy-looking ARN means stop. Also expect 5 `random_password`, the instance, the volume, the zone and the state-bucket resources among the deletes. If any check differs, stop.

Destroy: `s apply "$W/destroy.tfplan"`. If it stops partway, re-run `s plan -destroy -input=false -out="$W/destroy.tfplan"` and apply it again.

Verify gone (read-only):

- `a s3api head-bucket --bucket mccorlabs-com-tfstate` returns 404.
- `a route53 list-hosted-zones-by-name --dnsname mccorlabs.com` shows only the T6 zone.
- `a ses list-identities` prints only `legacybenefitsmn.com`.
- `a iam list-roles --query "Roles[?starts_with(RoleName,'mccorlabs-com')].RoleName"` is `[]`.
- `a iam get-user --user-name mccorlabs-com-mail-relay` returns NoSuchEntity.
- `a budgets describe-budgets --account-id 150701180133` has no `mccorlabs-monthly`.
- `a ec2 describe-instances --filters Name=tag:Project,Values=mccorlabs Name=instance-state-name,Values=running --query 'Reservations[].Instances[].InstanceId'` is empty.
- `a ssm describe-parameters --parameter-filters Key=Name,Option=BeginsWith,Values=/mccorlabs.com/mail --query 'Parameters[].Name'` is `[]`.

Legacy untouched (read-only):

- `a ses list-identities` still lists `legacybenefitsmn.com`.
- `a cloudfront get-distribution --id E2WI3DZRX9HXSA` succeeds.
- `a iam list-roles` still shows `legacybenefitsgroup-github-deploy`, `-github-terraform` and `-lambda`.
- `a iam list-open-id-connect-providers` still lists `token.actions.githubusercontent.com`.
- `legacybenefitsgroup-tfstate-150701180133` and `legacybenefitsgroup-assets-150701180133` still exist.

Survives the teardown and is not touched by it:

- SES account-level production access, sending quota and the suppression list.
- EC2 port-25 throttle removal approval, if granted. Whether it carries to a new EIP is UNVERIFIED.
- Reverse-DNS (PTR) records for the old EIP. The new EIP needs its own request.
- CloudWatch log groups the instance created (UNVERIFIED).
- The Namecheap registration.
- 28 DLM snapshots (tag `Backup=mccorlabs-com-mail`, source volume `vol-00f2cf80e24f3ca9b`). They hold the only copy of the mail data and keep billing. OWNER decides: keep (restorable) or delete. List with `a ec2 describe-snapshots --owner-ids self --filters Name=tag:Backup,Values=mccorlabs-com-mail --query 'Snapshots[].[SnapshotId,StartTime]' --output text`. Delete only on the owner's explicit yes: `for id in $(a ec2 describe-snapshots --owner-ids self --filters Name=tag:Backup,Values=mccorlabs-com-mail --query 'Snapshots[].SnapshotId' --output text); do a ec2 delete-snapshot --snapshot-id "$id"; done`.

OWNER approves cleanup: `git worktree remove --force "$W"`, which also deletes the local state and plans that hold secrets. Commit: none (no repo change).

### T9 laptop: dry run (read-only)

```
P=/private/tmp/claude-501/-Users-mj-repos-mccor-labs/33445f69-8b01-4469-a6a2-1798d41b0f42/scratchpad/dry.tfplan
r() { op run --no-masking --env-file=infra/terraform.env -- "$@"; }
r terraform -chdir=infra init -reconfigure
r terraform -chdir=infra plan -out=$P
terraform -chdir=infra show -json $P | scripts/plan-guard.sh infra/destroy-allowlist.txt; echo $?
terraform -chdir=infra show -no-color $P | grep -cE 'AKIA|BEGIN .*KEY'
terraform -chdir=infra show -no-color $P | grep -c 'sensitive value'
r env -u AWS_PROFILE aws ec2 describe-addresses --query 'length(Addresses)'
r env -u AWS_PROFILE aws service-quotas get-service-quota --service-code ec2 --quota-code L-0263D0A3 --query Quota.Value
```

Expected: creates only for ACM, CloudFront, the site bucket and OAC, the function, records, the deploy role and policy, the budget, the mail server, SES, health check, alarms, DLM, SNS and SSM. The zone and terraform role show no change. Zero deletes and guard exit 0. The `AKIA|BEGIN .*KEY` count is 0. Sensitive values print as `(sensitive value)` or `(known after apply)`. The EIP count is below the quota (quota code UNVERIFIED). Anything that deletes or replaces means stop. Delete the plan file afterwards.

### T10 OWNER: push, PR, merge, first CI apply

1. The owner pushes the branch and opens a PR. `CI` (quality, e2e, terraform) must be green first. Fix real failures in code; never edit tests to pass them.
2. Merge. `Deploy` runs on main: quality, build, terraform, deploy. The first run creates ACM, CloudFront, the site, records, SES, the mail server and the budget. It can take 30 to 60 min.
3. Re-run path. Within 24 h, Actions "Re-run failed jobs" works. After 24 h the `site` artifact has expired, so use `workflow_dispatch` on main (full run). A graceful stop saves partial state and the apply is idempotent. If a runner dies hard, or the timeout kills it, recently created resources can be missing from state and collide on their fixed names at the next plan. Recover by importing them from the laptop (`r terraform -chdir=infra import <address> <id>`). Typical collisions are IAM user `mccorlabs-com-mail-relay`, SNS topic `mccorlabs-com-mail-alerts`, SSM `/mccorlabs.com/mail/*` and the OAC or CloudFront function names. A stale lock: `r terraform -chdir=infra force-unlock <id>`. If ACM validation timed out, check `dig NS mccorlabs.com` and re-run. SES and DKIM verification is asynchronous: `a ses get-identity-verification-attributes --identities mccorlabs.com`.

Verify: laptop `r terraform -chdir=infra plan -detailed-exitcode` exits 0. `curl -sI https://mccorlabs.com/` returns 200, and `curl -s https://mccorlabs.com/robots.txt` contains `Sitemap: https://mccorlabs.com/sitemap.xml`.

### T11 OWNER and laptop: after the first apply

- Mail server check. A green apply does not prove the mail server booted. `aws_instance` does not wait for user_data, and `setup.sh.tftpl:80-105` can exit FATAL when `mail.mccorlabs.com` is not yet resolvable. Check `openssl s_client -connect mail.mccorlabs.com:993 -servername mail.mccorlabs.com </dev/null` and `nc -vz mail.mccorlabs.com 25`. If TLS or ports fail, recover by hand from the laptop: `r terraform -chdir=infra apply -replace=module.mailserver.aws_instance.mail`. This is the laptop path, because the CI guard blocks replaces. Let's Encrypt allows 5 duplicate certificates per week, so do not loop on it.
- Fetch the new mailbox passwords: `r terraform -chdir=infra output -json mailbox_passwords`. Save them in 1Password by hand, never in CI or logs.
- Confirm the SNS alert subscription email.
- Request a PTR record and, if needed, port-25 removal for the new EIP. Check SES production access with `a sesv2 get-account`.
- Media: a clean checkout lacks `app/web/public/media`. If the site shows no imagery, commit the media or run `./infra/deploy.sh publish` once to seed `media/` and `fonts/`.
- Docs (README, nearest CLAUDE.md) are edited only after the owner sees the exact text. Mention: single stack, no workspaces, CI deploy, break-glass `deploy.sh`.

## Rollback and break-glass

- Bad infra merge: revert with another commit. If the revert deletes or replaces anything, the guard blocks it until a PR adds the address to `infra/destroy-allowlist.txt`.
- Bad site deploy: `workflow_dispatch` with a main SHA redeploys that site build. The terraform job still applies current main infra, not `inputs.ref`.
- Trust-policy lockout (bad `github_subject_prefix`): laptop `./infra/deploy.sh apply`.
- Laptop break-glass: `./infra/deploy.sh plan|apply|publish` uses the same state with Development admin keys and bypasses plan-guard. A per-checkout cutover is `git pull` then `terraform -chdir=infra init -reconfigure`, never `-migrate-state`.

## UNVERIFIED

- No Terraform, AWS write or `op` write command was executed. Terraform is not installed in this session.
- Which providers the modules need beyond aws and random (`archive`, `local`).
- tflint `recommended` findings and trivy IDs and path form for the mccor modules.
- Whether `terraform test` needs AWS credentials.
- Whether specs and the build pass without the untracked media on a clean checkout.
- `pnpm-lock.yaml` re-resolves cleanly under pnpm 12.9.1.
- 1Password CLI service-account creation on the owner's plan (fallback: web UI).
- The ARM install of `1password/install-cli-action` (fallback: `ubuntu-latest` for the build job).
- Whether `force_detach` applies in place, whether setup needs variables beyond the three overrides, and the EIP quota code.
- Whether port-25 approval persists on a new EIP.
- Whether legacy's `lefthook.yml` sections match this repo's hook names.
