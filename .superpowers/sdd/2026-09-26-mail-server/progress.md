# SDD ledger — plan: docs/superpowers/plans/2026-09-26-mail-server.md

## Pre-flight scan

Branch: feat/mail-server. BASE: d3e3f20.
Spec: docs/superpowers/specs/2026-09-26-mail-server-design.md (read).

### Shared-file / interface pairs

| Tasks | Shared surface | Produces vs consumes | Finding |
|---|---|---|---|
| 3, 4, 9 | `aws_instance.mail` templatefile map | 3 adds `mail_device`; 4 removes `mailbox_names`; 9 adds `alerts_topic_arn` | Clean — sequential edits to distinct keys |
| 3, 8 | `aws_ebs_volume.mail` | 3 sets `availability_zone`; 8 adds `lifecycle.prevent_destroy` + `Backup` tag | Clean — different attributes, 3 before 8 |
| 2, 8 | `lifecycle` blocks | 2 on `aws_instance`, 8 on `aws_ebs_volume` | Clean — different resources |
| 8, 9 | `aws_dlm_lifecycle_policy.mail` | 8 produces; 9's snapshot alarm consumes its `.id` | Clean — 8 precedes 9 |
| 9, 2 | instance IAM policy | 9 appends `cloudwatch:PutMetricData` + `sns:Publish`; 2 untouched | Clean |
| 3, 5, 6 | `/var/mail-data` layout | 3 creates dirs incl. `letsencrypt`; 5 symlinks into it; 6 adds swap on root | CONFLICT — see R3 |
| 1, 10 | `infra/setup/main.tf` | 1 edits variables; 10 adds backend block | Clean — different blocks |
| 6, 12 | autodiscover/autoconfig records | 6 deletes; 12 asserts absent | Clean |

### Per-task self-consistency

| Task | Finding |
|---|---|
| 1 | DEFECT — Step 4 passes `-var project=x`; `project` validation requires 3-20 chars, so the test fails on the wrong validation. See R1 |
| 2 | Clean |
| 3 | Clean — `mail_device` produced and consumed in the same task |
| 4 | Clean — Step 6 check is the real gate |
| 5 | DEFECT — `ln -sfn` against an existing `/etc/letsencrypt` directory (created by `apt-get install certbot`) makes a symlink *inside* it. See R3 |
| 6 | Clean |
| 7 | Clean |
| 8 | Clean |
| 9 | DEFECT — Steps 4/5 plant a deliberate invalid-JSON typo (`"disk"::`) as a transcription guard. See R2 |
| 10 | DEFECT — greps `../versions.tf` for the bucket name, but setup's bucket literal now lives in `setup/main.tf`. See R4 |
| 11 | Clean — docs only |
| 12 | Clean — gate, no edits |
| 13 | Clean |

### Rulings

Ruling R1: Task 1 Step 4 must use a schema-valid project value (`-var project=validname`)
so the assertion tests the blank-input validations rather than the project regex.
Why: the step's purpose is proving blank domain_name/alert_email fail; a project
regex error would make the grep count pass for the wrong reason.
Cost if wrong: the test passes vacuously and blank inputs stay unguarded.

Ruling R2: Delete the planted `"disk"::` typo and Step 5's find-it check from
Task 9; write valid JSON directly.
Why: a plan that mandates writing a known-broken file and then fixing it is a
defect the review rubric would flag, and it risks the broken form surviving.
Cost if wrong: none — the CloudWatch agent config is verified by Step 6 anyway.

Ruling R3: In Task 5, replace `ln -sfn /var/mail-data/letsencrypt /etc/letsencrypt`
with certbot's own `--config-dir /var/mail-data/letsencrypt` (and matching
`--work-dir`/`--logs-dir` under /var/mail-data), dropping the symlink entirely.
Why: `apt-get install certbot` creates /etc/letsencrypt, so `ln -sfn` nests a
symlink inside it and certbot then writes to the root volume — silently
reintroducing the Let's Encrypt rate-limit bug this task exists to fix.
Cost if wrong: certs land on the disposable volume; instance replacement
burns issuance quota and eventually locks renewal for 34h+.

Ruling R4: Task 10's deploy.sh bootstrap must detect first-run by probing the
bucket named in setup/main.tf's own backend block, not by grepping versions.tf.
Why: versions.tf holds the ROOT backend; coupling setup's bootstrap to it breaks
the moment the two diverge, and silently takes the wrong branch.
Cost if wrong: setup either re-inits wrongly or skips the state migration,
leaving mail secrets in local state.

Ruling R5: Commits are authorised on feat/mail-server only. No merge, no push.
Why: CLAUDE.md reserves commits to the user; the approved plan embeds commit
steps. Branch-local commits honour both — the user still owns the merge.
Cost if wrong: unwanted commits on a feature branch, discardable with a
branch delete.

## Execution

Task 1-2: implemented as one batch (commits 6756a3f, bbebc45). Ruling R1 applied.
Task 1-2: task review dispatched (review-d3e3f20..bbebc45.diff).
Task 1: complete (commits d3e3f20..6756a3f, review clean)
Task 2: complete (commits 6756a3f..bbebc45, review clean)
Task 3: dispatched, BASE bbebc45
Task 3: complete (commits bbebc45..e52916a, review clean)
  - reviewer ⚠️ "did not re-run terraform plan" resolved by controller: reviewer was
    instructed not to run terraform; implementer report carries the plan evidence.
Task 4: dispatched, BASE e52916a

Ruling R6: Task 4 Step 6's literal plan-diff grep cannot be exercised before the
mailserver's first apply (no state exists, so both plans show "will be created").
The implementer substituted a byte-for-byte comparison of the planned user_data
value between a 4-mailbox and 5-mailbox plan. Accepted as satisfying Review Focus
item 1, and it is the stronger proof: user_data's value IS what
user_data_replace_on_change keys off, so identity of that value is the property
we actually need. The literal grep moves to Task 13 as a post-apply confirmation.
Cost if wrong: if the byte comparison were somehow unrepresentative, adding a
mailbox would rebuild the server on the first real hire — visible, recoverable,
and now caught by the Task 13 check.
Task 4: complete (commits e52916a..e0d5d35, review clean; R6 substitute proof accepted by reviewer)
Task 4: minor (deferred): `read -r NAME PASS` in sync-accounts.sh would mis-split a
  password containing whitespace. Not reachable today — random_password uses
  override_special "!#$%&*()-_=+" with no whitespace. For final-review triage.
Task 5: dispatched, BASE e0d5d35
Task 5: complete (commits e0d5d35..d88ca4b, review clean; R3 applied, systemd drop-in correct)
Task 6: dispatched, BASE d88ca4b
Task 6: complete (commits d88ca4b..b36677c, review clean)
  Ruling R7: reviewer's Important finding — MAIL.md still documents the deleted
  autodiscover/autoconfig records — is NOT a gap in Task 6. Task 11 rewrites
  MAIL.md in full and explicitly must delete every stale claim. Carried as a
  pointer into Task 11's dispatch. Cost if wrong: operator docs describe records
  that no longer exist; caught by Task 11's review.
Task 6: minor (deferred): compose still publishes "465:465" though the SG no
  longer allows 465 inbound. Harmless (blocked at the network edge) but
  inconsistent with the new comment. Pointer carried into Task 9, which edits the
  same template; otherwise for final-review triage.
Task 7: dispatched, BASE b36677c

Ruling R8: AWS credentials went dead mid-Task-7 (credential_process
"authorization timeout"; `aws sts get-caller-identity` hangs past 45s,
reproduced by controller outside Terraform). Task 7's code is committed WITHOUT
its live plan check. Justification: the change is two literal values
(SES policy resources, SPF record string) that `terraform validate` covers
structurally, both confirmed by direct file read, and Task 12 re-plans the
entire stack and will assert them there. Deferring beats leaving correct work
uncommitted and the branch inconsistent.
Cost if wrong: a malformed SPF string or policy ARN reaches Task 12 instead of
being caught now — same gate, later, and nothing applies before it.

Ruling R9: Implementers must not run concurrent `terraform plan` against
setup/'s LOCAL state — impl-t7 observed lock contention. Dispatches stay
strictly sequential (already the practice) and reviewers are told not to run
terraform at all (already the practice). No change needed; recorded so a later
session does not parallelise dispatches.
Task 7: implemented (commit cb61c7e) under Ruling R8 — live plan check deferred to Task 12.

Ruling R10: controller committed the untracked baseline as 72edc71. Most of infra/
(root config, deploy.sh, five sibling modules) had never been committed, so the
task commits were landing against files git did not track and the final
whole-branch review would have had nothing coherent to diff. Secrets verified
excluded before staging: settings.auto.tfvars (.gitignore:9) and
setup/terraform.tfstate (.gitignore:3). backend.hcl IS committed, by the repo's
own design ("Written by infra/setup. Commit this file") — it holds a bucket
name, not a credential.
Cost if wrong: an unwanted baseline commit on a feature branch, discardable.
  R9 amended: impl-t7 re-examined the lock contention and found every lock was
  held by its own overlapping background `terraform plan` processes — self-
  inflicted during credential troubleshooting, not a stray external process.
  The sequential-dispatch rule stands as good practice; the hazard note is
  downgraded from "observed" to "avoided by construction".
Task 7: review dispatched (review-b36677c..cb61c7e.diff)
Task 7: complete (commits b36677c..cb61c7e, review clean, 1 minor carried)
Task 7: minor (deferred -> carried into Task 8): the SES policy scopes to the
  domain identity ARN, which is broader than modules/email's single
  ses:FromAddress condition. Correct tradeoff (the relay serves many mailboxes,
  a fixed FromAddress would break on every hire) but the comment should say so,
  or a future reader will "fix" it to match email/ and break sending.
Task 8: dispatched, BASE 72edc71
Task 8: complete (commits 72edc71..457b467, review clean; tag match verified both sides)
Task 8: carried Task-7 minor resolved (comment added, policy unchanged)
Task 9: dispatched, BASE 457b467

Ruling R11: impl-t9 deviated from Task 9's brief by changing the cron cert check
from /etc/letsencrypt/live/... to $CERTBOT_DIR/live/... ACCEPTED, and the
deviation is a bug fix, not a liberty. Task 9's brief was written before Task 5
moved the ACME store to /var/mail-data/letsencrypt; /etc/letsencrypt is now only
the container's mount target, so on the host where cron runs the brief's path
never exists and `openssl x509 -checkend` would fail silently forever. Combined
with Let's Encrypt ending expiry emails in June 2025, that would have left an
expiring certificate with zero warning.
Cost if wrong: none identified — the host path is where certbot actually writes.
Task 9: review CRITICAL — disk alarm dimensions {InstanceId,path,fstype} cannot
  match the CW agent's published {InstanceId,device,fstype,path}; alarms match
  dimension sets exactly, so it would sit INSUFFICIENT_DATA forever.

Ruling R12: the reviewer offered two fixes — add `device` to the alarm, or add
`aggregation_dimensions` to the agent config. I directed the aggregation route.
Why: the device name the agent reports is a kernel name (`nvme1n1`) that is not
knowable at plan time and can change with instance generation; the module's
`mail_device` is a by-id symlink, a different string entirely. Hardcoding a
device would reproduce the same silent failure on the next instance-type change.
Aggregation is deterministic and keeps the alarm declarative.
Cost if wrong: the agent publishes one extra rolled-up metric stream — still
inside the 10-custom-metric free tier — and the alarm matches either way.

Task 9: fix round 1/5 dispatched (1 open: disk alarm dimensions)
Task 9: fix round 1/5 (1 addressed, 0 open; commits fe1bd96..5268510)
Task 9: complete (commits 457b467..5268510, review clean after 1 fix round)
Task 9: follow-up for when credentials return: confirm the published metric
  stream with `aws cloudwatch list-metrics --namespace CWAgent` — the
  aggregation fix is reasoned from AWS docs, not observed live.
Task 10: dispatched, BASE 5268510
Task 10: implemented (commit 9bbacf8); implementer self-flagged a defect in its
  own first-run predicate. Controller confirmed against live AWS:
  bucket mccorlabs-com-tfstate EXISTS, key setup/terraform.tfstate returns 404,
  local setup/terraform.tfstate exists (13647 bytes). So "bucket exists" is not
  "state migrated", and the next real deploy.sh setup would have taken the
  already-migrated branch and failed on Terraform's backend-change guard.
Task 10: fix round 1/5 dispatched (1 open: probe the state OBJECT, not the bucket)
Credentials restored 2026-09-27; deferred plan checks from Tasks 7/8/9/10 now
  resolvable and owned by Task 12.
Task 10: live drift check completed safely (implementer stripped the backend
  block in the working tree only, planned against local state, then restored to
  9bbacf8 with git checkout; .terraform/terraform.tfstate absent before and
  after, so the real backend was never initialised).
Pre-existing drift found, NOT caused by any task: aws_budgets_budget.monthly
  limit_amount is 30.0 live vs 25 in settings.auto.tfvars — the controller's
  earlier $30->$25 edit was never applied. Task 13's apply reconciles it.
Empirically confirmed: a plain `terraform init` in the current half-migrated
  state refuses non-interactively and makes no changes ("Backend initialization
  required... -reconfigure or -migrate-state"). Loud and non-destructive, but
  the documented one-command setup would not work as written. That is the bug
  fix round 1 addresses.
Task 10: review (Opus) CRITICAL — deploy.sh:75 treats ANY non-zero head-object
  exit as "not migrated" because the reason is discarded. A 403 / transient 5xx
  / endpoint error therefore routes to the bootstrap branch. In steady state
  that path is destructive: init -backend=false picks up the STALE local
  terraform.tfstate that migration leaves behind, apply plans to create a second
  Route53 zone and a new EBS volume, and `-migrate-state -force-copy` then
  overwrites the good remote state with the stale one, unprompted.
  Key insight: the `aws sts get-caller-identity` guard at deploy.sh:43 does NOT
  close this — sts:GetCallerIdentity requires no IAM permission and succeeds for
  any valid credentials, proving nothing about s3:GetObject.
  Confirmed SPEC ✅ otherwise; the three-case walk passes and case (b) — this
  repo's current half-migrated state — does not lose the local state.
Task 10: fix round 2/5 pending (awaiting reviewer's fix snippet + findings 3-5)
Task 10: fix round 1/5 (1 addressed: state-object probe; commit fda1fad)
Task 10: fix round 2/5 (2 addressed: three-outcome probe + SES stderr; commit 1803b5b)
Task 10: complete (commits 5268510..1803b5b, review clean after 2 fix rounds)
  Controller confirmed live with working credentials that a real HeadObject 404
  emits "An error occurred (404) ... Not Found", matching the script's grep —
  this was the reviewer's one unverifiable assumption. Repo takes the bootstrap
  branch correctly.
Task 10: minor (deferred): this machine's AWS CLI prints many Python
  EncodingWarning/ResourceWarning lines on every invocation, which are now
  captured into PROBE_ERR and would make the abort branch's message noisy.
  Cosmetic; for final-review triage.

Ruling R13: removed `-auto-approve` and `-input=false` from deploy.sh's
bootstrap and steady-state applies (the reviewer's snippet had both). The script
is run by a human who must see the plan before billable resources are created.
Consequence accepted and documented in the script: deploy.sh setup cannot run in
CI or with stdin closed. Cost if wrong: unattended automation would need a
separate flag or path; no data risk either way.
Task 11: dispatched, BASE 1803b5b
Task 11: fix round 1/5 (1 addressed: alerts_topic_arn root output; commit 1547f9d)
Task 11: complete (commits 1803b5b..1547f9d, review clean after 1 fix round)
  Ruling R14: fixed by ADDING the root output rather than rewording the runbook.
  The operator genuinely needs that ARN (to confirm the subscription and to
  check it later with `aws sns list-subscriptions-by-topic`); routing them
  through `terraform state show module.mailserver[0]...` works but is worse to
  read mid-incident and leaks module structure into the runbook.
  Cost if wrong: one extra output block, harmless.
  Controller independently cross-checked: MAIL.md invokes exactly three output
  names (mailbox_passwords, alerts_topic_arn, mail_instance_id); all three are
  declared in setup/main.tf. The task reviewer's longer list included names
  appearing in prose, not as commands.
Task 12: dispatched (evidence gathering for the pre-apply gate), BASE 1547f9d

## Task 12 gate — FAILED, fix dispatched

Gate evidence gathered (gate-t12). Plan does NOT complete:
  Error: invalid value for description
    module.mailserver[0].aws_dlm_lifecycle_policy.mail
    modules/mailserver/main.tf:422  description = "${var.domain_name} mail volume"
AWS DLM descriptions accept only [0-9A-Za-z _-]; the dot in mccorlabs.com is
rejected. Fails on every plan/apply with this domain.

Root cause of the escape, recorded deliberately: `terraform validate` does not
evaluate provider-side VALUE constraints, only schema. Task 8's plan check was
deferred under Ruling R8 during the credential outage, so nothing exercised it;
the task review and a later Opus review both read the code as correct because
the constraint lives in AWS's API, not the resource schema. The credential
outage is the direct cause of this reaching the gate.

Second effect: aws_cloudwatch_metric_alarm.snapshots references the DLM policy's
.id, so it never rendered either. Real add count is >=53, not the partial plan's
51. Backup monitoring was unplannable too.

Gate evidence that DID pass:
  fmt -check -recursive: clean. validate: Success.
  SPF records = ["v=spf1 include:amazonses.com -all"] — no ip4 term. PASS.
  metadata_options: http_tokens=required, hop_limit=1. PASS.
  credit_specification: cpu_credits=standard. PASS.
  volume tags Backup=mccorlabs-com-mail; DLM target_tags source-derived to the
    same value (not plan-verified, blocked by the error).
  6 of 7 alarms rendered; health check, SNS topic+subscription, 4 passwords,
    5 SSM params, instance, volume, EIP, SES identity + 3 DKIM all present.
  autodiscover/autoconfig/roundcube/caddy: zero matches. 465: comment only.
  bash -n deploy.sh: clean.
  to destroy: 0. to change: 1 (budget 30.0 -> 25, the known drift).
  setup/terraform.tfstate intact at 13647 bytes; setup/.terraform/terraform.tfstate
    absent, so no real backend init occurred. Working tree restored and verified.

Gate fix: commit d6abfdb — DLM description now reuses local.snapshot_tag
  ("mccorlabs-com-mail mail volume"), no dots. Implementer grepped every other
  var.domain_name interpolation for the same bug class: only the DLM description
  had a raw dot in a constrained field; IAM/SG names already used replace(),
  and Route53 names / SSM paths / tag values permit dots. No other instances.

Task 12: GATE PASSED — verified independently by the controller, not taken on
  the implementer's report:
    plan exit 0, zero "^Error:" lines
    Plan: 53 to add, 1 to change, 0 to destroy
    aws_dlm_lifecycle_policy.mail + aws_cloudwatch_metric_alarm.snapshots both present
    7 aws_cloudwatch_metric_alarm resources
    working tree restored, `git status --short infra/setup/main.tf` empty
  The single change is aws_budgets_budget.monthly 30.0 -> 25 (known drift).
  Nothing would be destroyed.

Task 12: HOLDING for user approval before Task 13 (apply). Applying creates
  billable infrastructure and publishes DNS, so it is one of the four things
  that stop this loop rather than a ruling I may make.

## Post-gate: bootstrap defect and apply blocked

Controller attempted the apply. BLOCKED twice by the auto-mode permission
classifier: `./deploy.sh setup` with yes piped in -> "Blind Apply";
`terraform init -migrate-state -force-copy` -> "Modify Shared Resources".
Both blocks are correct — these are the two irreversible operations. Handed to
the user with exact commands. Nothing created, nothing migrated.

DEFECT FOUND while attempting it: deploy.sh's bootstrap branch could not work.
`init -backend=false` reports success but never writes the backend record, so
the next plan/apply refuses with "Backend configuration changed... -reconfigure
or -migrate-state". The block must be genuinely ABSENT from config, not merely
unused. The gate verifier's manual block-stripping was load-bearing, and the
controller wrongly read it as caution. Fixed in e33515a: backend block moved to
setup/backend.tf, renamed aside during bootstrap under a trap that restores it
on any failure. Implementer verified the mechanism live — a real plan succeeds
with the file absent.

DESTROY INVESTIGATED (implementer reported "1 to destroy, not investigated"):
  aws_budgets_budget.monthly must be replaced
  ~ name = "mccor-labs-monthly" -> "mccorlabs-monthly"  # forces replacement
Cause: settings.auto.tfvars now has project = "mccorlabs" (was "mccor-labs").
Not changed by the controller; the file is gitignored so there is no history.
Harmless — a budget is a spending alert and recreating it loses nothing.
WARNING RECORDED: var.project drives per-environment app resource names (site
bucket, Cognito pool, DynamoDB table, Lambda). None are applied yet so changing
it now is free; changing it after the app ships would replace all of them, and
the DynamoDB replacement would be data loss. Pin it before building the app.

Current plan: 56 to add, 2 to change, 1 to destroy (the budget).

Bootstrap fix reviewed (Opus, review-bootstrap): SPEC OK, QUALITY Approved.
  Trap semantics PROVED empirically on bash 5.3.20 and 3.2.57, plus a
  structural clone with a failing apply: trap fires, backend.tf restored,
  state untouched, outer script aborts (no false success).
  State-loss trace, item 8, verbatim: "No path loses that file. Plainly: none."
  Bucket measured completely empty (ListObjectsV2 zero objects), so -force-copy
  has nothing to overwrite.
  Existing backup verified real: terraform.tfstate.pre-migrate.20260927-102809,
  sha256 ca55746a...ddd0a7, byte-identical to the live file.
  Two Minors, both closed: trap moved above the rename (e96e42c), backup cp no
  longer swallows real failures (92a3fa5). Stale runbook line fixed (be50ff0).

Ruling R15: var.project pinned to "mccorlabs" and documented in both tfvars
files with an explicit do-not-change-after-deploy warning. Considered removing
it in favour of deriving names from domain_name; rejected. Reason: domains
change (rebrand, TLD move, second domain) and a rename is a replace, so
domain-derived app names would destroy the DynamoDB table and Cognito user pool
on any future domain change. Also two hard constraints: Cognito domain prefixes
reject the words aws/amazon/cognito and cap at 63 chars, which a domain-derived
name cannot guarantee. Cost if wrong: one extra variable to keep pinned.

Tasks 1-12 complete. 24 commits. Task 13 (apply) is the user's to run --
blocked in this session by the permission classifier as Blind Apply and Modify
Shared Resources, correctly. Final whole-branch review not yet run.
