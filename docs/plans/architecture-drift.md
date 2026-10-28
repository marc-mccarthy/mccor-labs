# Architecture drift

Created: 2026-10-28 · Updated: 2026-10-28

## Goal

Keep the current shape (static export on S3 + CloudFront, Lambda Function URLs behind CloudFront
OAC, one Terraform root plus bootstrap, pnpm workspace). Remove duplication and drift found in the
2026-10-27 architecture review, and take mail off EC2. No framework or tooling swaps.

Rulings carried over from the review:

- Ruling: keep Next.js static export, Function URLs, single Terraform root; no Turborepo, API
  Gateway, environments or CDK (cost if wrong: a later migration, none of these block scaling at
  two packages).
- Ruling: hosted mailbox replaces docker-mailserver on EC2; SES, DKIM, SPF, DMARC, BIMI stay in
  Terraform (cost if wrong: one month of a $19/yr provider plus re-pointing MX back).

## T1 Shared validation package

Contact rules live twice: `app/web/src/lib/contact.ts:33-55` and
`app/api/src/lib/contactInput.ts:27-39`. Lab response types are also hand-mirrored, and
`app/web/src/lib/labCost.test.ts:2` already reaches into `app/api` by relative path.

- ST1 Add `app/shared` (`name: shared`, `private`, `type: module`, `exports` map for `./contact`
  and `./lab`), listed by the existing `app/*` workspace glob.
- ST2 Move the contact field rules and error-code union into `app/shared/src/contact.ts`. Web and
  api import it with `workspace:*`. Keep honeypot and `MIN_FILL_MS` server-only.
- ST3 Move the lab request and response types and `PRICES` into `app/shared/src/lab.ts`; delete the
  relative import in `labCost.test.ts`.
- ST4 Add `app/shared` to `eslint.config.ts` `projectService` and to CI `quality` (`tsc`, `lint`,
  `test:run`).
- Accept: `pnpm -F web exec vitest related app/web/src/lib/contact.ts --run` and
  `pnpm -F api exec vitest related app/api/src/lib/contactInput.ts --run` pass; grep for
  `../../../api/` in `app/web` returns nothing.
- Ruling: plain TypeScript, no zod (cost if wrong: adding zod later is additive, the schema shape
  stays).

## T2 Orphan checks

No caller exists for `*.tftest.hcl`, `infra/modules/static_site/tests/viewer_request.test.mjs`
or `.github/scripts/eval-cap.test.sh`.

- ST1 Add a `terraform test` step per module and root to `.github/workflows/terraform.yml` after
  `validate`, and to the `terraform` pre-push block in `lefthook.yml`.
- ST2 Run `node infra/modules/static_site/tests/viewer_request.test.mjs` and
  `.github/scripts/eval-cap.test.sh` from `terraform.yml`.
- ST3 Add `pnpm -F api lint`, `tsc` and `test:run` to the lefthook pre-push block.
- Accept: `terraform.yml` green on a PR touching `infra/`; a deliberately broken assert in one
  `.tftest.hcl` fails the workflow.

## T3 One publish path

`infra/deploy.sh:138` serves media and fonts with a one-day cache; `deploy.yml:196` serves them
immutable.

- ST1 Extract the sync, invalidate, stale-delete and verify steps into `infra/publish.sh`
  (immutable for `_next/static`, `media`, `fonts`; revalidate for the rest).
- ST2 `deploy.sh publish` and `deploy.yml` both call `infra/publish.sh`.
- ST3 Fix `README.md:281` to match.
- Accept: `shellcheck infra/publish.sh` clean; `deploy.yml` deploy job uses only the script.

## T4 Hardcodes

- ST1 Account id `150701180133` in `infra/backend.tf:3`, `infra/bootstrap/backend.tf:3`,
  `deploy.yml:124`, `eval.yml:77`: read from `data.aws_caller_identity` where Terraform allows,
  from a single `AWS_ACCOUNT_ID` 1Password field in workflows. Backend blocks cannot use variables,
  so keep the bucket name there but derive it once in `README.md`.
- ST2 `infra/modules/lab_api/lab_iam.tf:9` kill-flag path uses `var.name`.
- ST3 Guardrail SSM path: `infra/evals.tf:10` is `/${var.NAME}/labs/evals/guardrail`,
  `app/api/evals/src/cli.ts:25` is literal. Pass the path to the CLI as an env var set by
  `eval.yml` from the Terraform output.
- ST4 Model id lives only in `infra/modules/lab_api/variables.tf:45`; Lambdas read it from env,
  `app/api/src/config.ts:1` goes.
- Accept: grep for `150701180133` outside `backend.tf` returns nothing; grep for `mccorlabs/` in
  `app/api` and `infra/modules` returns nothing.

## T5 Lambda boilerplate

Role, policy, log group and function are repeated in `lab_api/main.tf`, `feedback.tf`,
`digest.tf`; `requiredEnv` is copied in all three handlers.

- ST1 One `locals.functions` map and `for_each` over `aws_lambda_function`,
  `aws_cloudwatch_log_group`, `aws_iam_role`; per-function policy statements stay explicit.
- ST2 Move `requiredEnv` to `app/api/src/lib/env.ts`; handlers import it.
- ST3 Delete `aws_iam_role.lab`, `aws_iam_role_policy.lab`, `aws_cloudwatch_log_group.lab` and
  `aws_ssm_parameter.lab_enabled` until the lab Lambda exists, or build the function in the same
  change.
- Accept: `terraform plan` shows moves only (`moved` blocks), no replace;
  `pnpm -F api exec vitest related app/api/src/handlers/*.ts --run` passes.
- Ruling: `for_each` over a local map, not a submodule (cost if wrong: a submodule later is a
  mechanical extraction).

## T6 Snapshot retention

`infra/modules/mailserver/main.tf:376-382` snapshots two volumes every 6 h and keeps 28 each.

- ST1 `interval = 24`, `count = 7`.
- Accept: `aws ec2 describe-snapshots --owner-ids self` drops to 14 or fewer within 8 days.

## T7 Mailbox off EC2

- ST1 Pick provider and create mailboxes for the four names in `TF_VAR_MAILBOXES`.
- ST2 New module `infra/modules/mail_dns`: SES identity, DKIM, SPF, DMARC, BIMI, MX pointing at
  the provider, SNS alerts topic. Move resources from `mailserver` with `moved` blocks so SES and
  DNS are not recreated.
- ST3 `lab_api` reads `ses_identity_arn` and `alerts_topic_arn` from `mail_dns`.
- ST4 Delete `infra/modules/mailserver`, its tests, `infra/destroy-allowlist.txt` entries,
  `TF_VAR_INSTANCE_TYPE`, `TF_VAR_MAIL_VOLUME_GB`, `TF_VAR_ADMIN_MAILBOX` from `app.env`, and the
  mail sections of `README.md`.
- ST5 Deploy order: provider mailboxes live, MX switched, mail verified both directions, then the
  EC2 destroy applies.
- Accept: `terraform plan` destroys only mailserver resources; mail to and from each mailbox works;
  monthly bill loses the EIP, EBS, snapshot and health-check lines.
- Ruling: T6 lands even if T7 is deferred (cost if wrong: one trivial revert).

## Order

T6 first (one line, immediate saving). T1 and T2 independent. T3, T4, T5 after T2 so the new checks
cover them. T7 last, on its own PR.
