# Task 8 report — DLM backups

Status: complete.
Commit: 457b467 — "feat(mailserver): 6-hourly DLM snapshots and prevent_destroy on the mail volume"

## Changes
- `aws_ebs_volume.mail`: added `lifecycle { prevent_destroy = true }`; tags now include `Backup = local.snapshot_tag` alongside `Name`.
- `locals.snapshot_tag = "${replace(var.domain_name, ".", "-")}-mail"` added.
- New `aws_iam_role.dlm` (assume-role for `dlm.amazonaws.com`) + `aws_iam_role_policy_attachment.dlm` using the AWS managed policy `arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole`.
- New `aws_dlm_lifecycle_policy.mail`: 6-hourly schedule, 28-count retain (7 days), tags_to_add includes `Name`/`Backup`, `copy_tags = true`.
- `outputs.tf`: added `output "snapshot_tag"`.
- Carried finding from Task 7 review: added one sentence to the `data.aws_iam_policy_document.smtp` comment explaining why the domain-identity-ARN scope (broader than `modules/email`'s single `ses:FromAddress`) is intentional — this relay sends as every mailbox on the domain. Policy itself unchanged.

## Verification
- `terraform fmt -recursive`: clean, no diffs.
- `terraform -chdir=setup validate -no-color`: "Success! The configuration is valid."
- `prevent_destroy` confirmed present on `aws_ebs_volume.mail` (did not disturb the AZ pin or its comment).
- DLM role confirmed using the AWS managed policy (not a hand-written policy document).

## Deferred verification (Ruling R8)
- Step 5's `terraform plan` was attempted once with a 25s timeout; it returned "Error: Request cancelled" (credential_process timeout, consistent with the known-dead credentials). Not retried. **Not asserted:** that `aws_dlm_lifecycle_policy.mail` and `aws_iam_role.dlm` actually plan as clean creates with real AWS state — this rests on `validate` (schema-only) instead. Task 12 owns re-running the plan once credentials are restored.

## Concerns
- None beyond the deferred plan check above.

## Gate fix

Real plan (once credentials worked) rejected `aws_dlm_lifecycle_policy.mail`'s
`description = "${var.domain_name} mail volume"`: AWS DLM only accepts
`[0-9A-Za-z _-]` there, and `mccorlabs.com`'s dot failed on every plan/apply.
`terraform validate` cannot catch this — it's a provider-side value
constraint, not a schema type.

Fix (commit d6abfdb): reused `local.snapshot_tag` (already
`replace(var.domain_name, ".", "-")`) instead of a second `replace()` call —
`description = "${local.snapshot_tag} mail volume"`.

Checked for the same bug class: grepped every `var.domain_name` interpolation
in `main.tf`/`outputs.tf`. All other name/name_prefix fields already used
`replace(var.domain_name, ".", "-")` (IAM role/user names, SG name_prefix).
Route53 record `name` fields and SSM parameter `name` fields keep the literal
dot deliberately (DNS names and SSM parameter paths both allow dots). Tag
*values* interpolating the raw domain (e.g. `Name = "${var.domain_name}-mail"`)
are unaffected — tag values are unconstrained. Only the one `description`
field was the bug.

Verification: `terraform fmt -recursive` clean. `terraform -chdir=infra/setup
init -backend=false` then `validate`: "Success! The configuration is valid."
Real plan via the backend-block-removed method: **`Plan: 53 to add, 1 to
change, 0 to destroy.`** with no errors. Both
`module.mailserver[0].aws_dlm_lifecycle_policy.mail` and
`module.mailserver[0].aws_cloudwatch_metric_alarm.snapshots` present in the
plan. `infra/setup/main.tf` backend block restored via `git checkout --`
immediately after, confirmed by `git status --short`.

New description value: `"mccorlabs-com-mail mail volume"`.
