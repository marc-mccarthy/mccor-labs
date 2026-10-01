# Task 10 report: remote state for setup/, scripted SES sandbox exit

Status: complete, verified live (read-only) after credentials came back.
Commit `9bbacf8` on `feat/mail-server`.

## Changes

- `infra/setup/main.tf`: added an S3 `backend` block inside the existing
  `terraform {}` block (`bucket = "mccorlabs-com-tfstate"`,
  `key = "setup/terraform.tfstate"`, `use_lockfile = true`, `encrypt = true`).
  Written literally, as backend blocks require, with a comment tying it to
  `local.state_bucket` below so a future edit to one is visibly next to the
  other.
- `infra/deploy.sh`: replaced the `setup` branch with the bootstrap sequence
  plus the scripted SES sandbox exit.
- `infra/MAIL.md`: documented the automatic bootstrap and SES request under
  step 1.

## Bucket-name probe (Ruling R4)

Chose: **read it from the backend block**, not recompute it. `deploy.sh` does:

```bash
STATE_BUCKET="$(sed -nE '/backend "s3" \{/,/^  \}/ s/^[[:space:]]*bucket[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' main.tf)"
```

confined to `setup/main.tf`'s own `backend "s3" { ... }` block, with an
explicit `exit 1` if nothing matches. Verified it returns exactly
`mccorlabs-com-tfstate` (`Bash`, ran the same `sed` against the file). A
mismatch between the backend block and the probe is structurally impossible
here — the probe *is* the block, not a second literal or a re-derivation
from `var.domain_name`. I did not use versions.tf (different root, per R4)
and did not recompute from `settings.auto.tfvars` (would still be a second
source of truth, just a different one).

## Bootstrap branch — run 1 / run 2 / run 3

Detection (AND of two independent negatives, both must hold for "first run"):
`.terraform/terraform.tfstate` absent **and** `aws s3api head-bucket` on the
probed bucket fails.

- **Run 1** (fresh clone, nothing exists): condition true →
  `terraform init -backend=false` (no backend to reach) → `terraform apply`
  (creates the bucket among everything else) → `terraform init -migrate-state
  -force-copy` (moves the just-created local state into the bucket it just
  made) → falls through to the shared `terraform apply` below (no-op, confirms
  the migrated state matches reality).
- **Run 2**: `.terraform/terraform.tfstate` now exists and records the s3
  backend, and the bucket is real → condition false → plain `terraform init`
  → `terraform apply`. No migration is attempted, so nothing gets re-copied
  or wiped.
- **Run 3+**: identical to run 2, indefinitely idempotent.

SES exit: guarded on `enable_mailserver = true` in `settings.auto.tfvars`;
`aws sesv2 put-account-details` stderr is discarded and the exit code drives
an already-requested/granted message instead of failing the run.

## Concern — this specific repo's current state (now CONFIRMED, not hypothetical)

`aws s3api head-bucket --bucket mccorlabs-com-tfstate` succeeds (exit 0,
`BucketRegion: us-east-1`): the bucket already exists in AWS from prior real
applies, while `setup/`'s state is still purely local
(`.terraform/terraform.tfstate`, the backend-selection cache, does not exist
— confirmed by `ls` before and after this check). So on the next real
`./deploy.sh setup`, `head-bucket` will succeed immediately and the AND
condition (`! -f .terraform/terraform.tfstate && ! head-bucket`) goes false
on its first term already being satisfied trivially — the script takes the
plain-`init` branch, not the bootstrap branch. I confirmed what that does:
a plain `terraform init` (no `-backend=false`, no `-migrate-state`) against
this exact directory refuses non-interactively:

    Error: Backend initialization required, please run "terraform init"
    Reason: Initial configuration of the requested backend "s3"
    ... Please run "terraform init" with either the "-reconfigure" or
    "-migrate-state" flags ...
    At this point, no changes to your existing configuration or state have
    been made.

So the failure is loud and non-destructive, exactly as hoped, but the
script as written does **not** recover from it on its own — it would need a
human to add `-migrate-state` by hand. That's a real gap for this specific
already-deployed repo (not for a fresh clone, where the bucket genuinely
doesn't exist and the bootstrap branch fires correctly). Flagging rather
than silently patching, since changing the detection logic changes the
Ruling R4 answer and should be a reviewed decision, not a last-minute add.

## Verification (Ruling R8 — completed live, not deferred)

Credentials came back mid-task (account 150701180133). Ran the brief's
Step 3 drift check for real, with care not to touch the real backend or any
state:

- Confirmed `.terraform/terraform.tfstate` (the real-backend record) was
  absent before touching anything — `terraform init -backend=false` could
  not trigger a migration.
- Temporarily removed the `backend "s3" {}` block from a **working-tree-only**
  copy of `setup/main.tf` (never staged/committed) so `terraform plan` could
  run entirely against the existing local `terraform.tfstate`, no backend
  reconfiguration involved. `terraform init -backend=false` +
  `AWS_PROFILE=default terraform plan -no-color -input=false
  -var-file=../settings.auto.tfvars` then ran clean.
- Result: **not** "No changes." One real drift item, unrelated to this
  task's diff — `aws_budgets_budget.monthly.limit_amount` is `30.0` live vs
  `25` in current config (`monthly_budget_usd` in `settings.auto.tfvars`).
  Nothing in this task touches the budget resource; this predates task 10
  and is worth a separate fix/apply, not part of this change.
- Restored `setup/main.tf` via `git checkout -- infra/setup/main.tf`
  (confirmed `git status` clean, backend block present again, matches commit
  `9bbacf8` exactly) and re-ran `terraform init -backend=false` +
  `terraform validate` to leave the directory in the same offline-validated
  state as before.
- Re-confirmed after restore: `.terraform/terraform.tfstate` still absent —
  the real S3 backend was never initialized or migrated at any point in this
  session.
- `bash -n deploy.sh` → `SHELL SYNTAX OK`; `terraform fmt -recursive -diff .`
  → no diff.

No `terraform apply`, `terraform init -migrate-state`, or any other
state-mutating command was run at any point.

## Fix round 1: first-run predicate detected the wrong thing

Team lead measured live: `head-bucket` on `mccorlabs-com-tfstate` succeeds
(bucket exists from an earlier stage-1 apply), but
`head-object --key setup/terraform.tfstate` in that bucket 404s, and a
13647-byte `setup/terraform.tfstate` exists locally. Bucket existence and
"my state is migrated" are independent facts — the same apply that creates
the bucket creates everything else too, so the bucket exists long before
this root's own state is actually moved into it. My original predicate
(`! -f .terraform/terraform.tfstate && ! head-bucket`) treated bucket
existence as "already migrated," which is exactly backwards for this repo's
real, current state.

**Fix**: `infra/deploy.sh` now probes for the state *object*, not the
bucket, and derives both bucket and key from the same backend-block extract
(one `sed` capture of the whole `backend "s3" { ... }` block, then two
sub-extracts) so they can't diverge from each other or from the block
Terraform actually uses:

```bash
BACKEND_BLOCK="$(sed -n '/backend "s3" {/,/^  }/p' main.tf)"
STATE_BUCKET="$(sed -nE 's/^[[:space:]]*bucket[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' <<<"$BACKEND_BLOCK")"
STATE_KEY="$(sed -nE 's/^[[:space:]]*key[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' <<<"$BACKEND_BLOCK")"
...
if ! aws s3api head-object --bucket "$STATE_BUCKET" --key "$STATE_KEY" >/dev/null 2>&1; then
  # bootstrap: init -backend=false, apply, init -migrate-state -force-copy
else
  # plain init
fi
```

Verified live: `aws s3api head-object --bucket mccorlabs-com-tfstate --key
setup/terraform.tfstate` exits non-zero (404, `HeadObject` "Not Found") —
matches team lead's measurement exactly. Also re-ran the bucket/key
extraction against the real `setup/main.tf` and got
`bucket=mccorlabs-com-tfstate key=setup/terraform.tfstate`, matching the
committed backend block.

### Three cases

- **(a) no bucket, no object — genuinely fresh account.** `head-object`
  fails (bucket doesn't even exist, let alone the key) → bootstrap branch:
  `init -backend=false` → `apply` creates the bucket and everything else →
  `init -migrate-state -force-copy` moves the fresh local state into the
  bucket it just made. Correct.
- **(b) bucket exists, no object — this repo, right now.** `head-object`
  404s → bootstrap branch fires correctly this time (the old predicate would
  have taken the plain-init branch here and died on Terraform's
  non-interactive backend-change guard). `apply` on the already-current
  local state is a near-no-op except for creating what's still missing (the
  bucket itself needs nothing created — it already exists), then
  `-migrate-state -force-copy` moves this root's real 13647-byte state into
  the object that's currently missing. Correct, and this is the exact case
  that was broken before this fix.
- **(c) bucket and object exist — steady state, every later run.**
  `head-object` succeeds → plain `terraform init` → `apply`. No migration
  attempted, matching runs 2/3+ from the original report.

## Step 3 drift check, re-run against the fixed script's assumptions

Same safe method as the first report: temporarily removed the
`backend "s3" {}` block from a working-tree-only copy of `setup/main.tf`
(python3 regex strip, never staged), ran `terraform init -backend=false` +
`AWS_PROFILE=default terraform plan -no-color -input=false
-var-file=../settings.auto.tfvars` entirely against the existing local
`terraform.tfstate`, then restored via `git checkout -- infra/setup/main.tf`
(confirmed clean against commit) and re-ran `init -backend=false` +
`validate`.

Result: unchanged from the first report — **not** "No changes." Same single
drift item, unrelated to this task's diff:

```
# aws_budgets_budget.monthly will be updated in-place
~ resource "aws_budgets_budget" "monthly" {
      id                = "150701180133:mccor-labs-monthly"
    ~ limit_amount      = "30.0" -> "25"
      ...
  }
Plan: 0 to add, 1 to change, 0 to destroy.
```

`monthly_budget_usd` is `25` in current config; live budget is still `30.0`.
Pre-existing, not caused by anything in task 10's diff (which doesn't touch
`aws_budgets_budget`). No `terraform apply`, `init -migrate-state`, or other
state-mutating command was run. `.terraform/terraform.tfstate` (the real
S3-backend record) remained absent throughout — confirmed before and after.

`bash -n deploy.sh` → `SHELL SYNTAX OK`. `terraform fmt -recursive -diff .`
→ no diff.

## Fix round 2: three-outcome probe, interactive applies, honest SES failures

Opus review found a critical hole under the round-1 fix: `head-object`'s
exit code was tested as a single boolean, so a 403, throttle, transient 5xx,
or region mismatch was indistinguishable from a genuine 404 and routed to
the bootstrap branch. In steady state that's destructive: `-backend=false`
picks up the leftover local `terraform.tfstate`, `apply` plans against that
stale snapshot, and `-migrate-state -force-copy` overwrites the real remote
state with it, unprompted (`-force-copy` exists to suppress exactly the
prompt that would have caught this). `sts:GetCallerIdentity` proves nothing
here — it needs no IAM permission at all, so it succeeds regardless of
whether the credentials can `s3:GetObject` this key.

**Fix, applied as specified (controller ruling R13 on top of the reviewer's
snippet):**

- Capture `head-object`'s stderr instead of discarding it, and branch on
  three outcomes, not two: success (migrated), a `(404)`/`Not Found` match
  in the captured text (not migrated, bootstrap), or anything else (abort
  loudly rather than guess — `exit 1` with the real error printed).
- `--region "$STATE_REGION"` passed explicitly, `region` now extracted from
  the same `backend "s3" {}` block capture as `bucket` and `key`, so all
  three can't diverge from what Terraform actually uses or from each other.
- Before the bootstrap apply: `cp terraform.tfstate
  terraform.tfstate.pre-migrate.<timestamp>` (best-effort, `|| true`). After
  the migrate-state init: `mv -f terraform.tfstate
  terraform.tfstate.migrated-<timestamp>`. Reasoning kept in the script's
  own comment: the leftover local file is what `-backend=false` would
  silently prefer over the remote on any later run, so it has to leave
  Terraform's search path; renamed rather than deleted because right after
  migration the remote copy is only seconds old and unverified by anything
  but Terraform's own exit code. `*.tfstate.*` is already gitignored.
- **R13**: removed `-auto-approve` from the bootstrap `terraform apply` (the
  reviewer's snippet had it) and, since `-input=false` and an interactive
  apply are incompatible, dropped `-input=false` from that apply too. Every
  `init` keeps `-input=false` (inits must never prompt). Applied the same
  reasoning to the one apply that runs after the if/elif/else for the
  steady-state case — it lost its `-input=false` as well, so a human sees
  the plan there too before anything real changes.
- SES call: captured stderr instead of `2>/dev/null`. Success prints the
  request-made message; a captured failure prints "already requested or
  granted" only when the message contains `already` or `pending`
  (case-insensitive) — anything else prints a `WARNING:` with the real
  message to stderr but does not exit non-zero, so a bad SES call can't
  fail an otherwise-good `apply`. Also guarded the case where `domain_name`
  or `alert_email` failed to parse from `settings.auto.tfvars` (previously
  would have sent `--website-url https://` and silently misfired).

**Verified:**

- `bash -n deploy.sh` → `SHELL SYNTAX OK`
- Re-extracted bucket/key/region from the live `setup/main.tf`:
  `bucket=mccorlabs-com-tfstate key=setup/terraform.tfstate
  region=us-east-1` — matches the backend block exactly.
- Ran the real probe with the region flag:
  `aws s3api head-object --bucket mccorlabs-com-tfstate --key
  setup/terraform.tfstate --region us-east-1` → `An error occurred (404)
  when calling the HeadObject operation: Not Found`. The script's
  `grep -qE '\(404\)|Not Found'` matches this exact string, confirmed by
  running it against the captured text — this repo correctly takes the
  bootstrap branch, not the abort branch.
- `terraform -chdir=setup init -backend=false && terraform -chdir=setup
  validate` → `Success! The configuration is valid.`
- `terraform fmt -recursive -diff .` from `infra/` → no diff.
- `.terraform/terraform.tfstate` in `setup/` confirmed absent before and
  after all of the above — the real S3 backend was never touched.

**Non-setup path check** (asked for explicitly): `deploy.sh`'s per-environment
branch (`deploy.sh:111-146`, `backend.hcl` + `terraform init
-backend-config=backend.hcl` + workspace select) is untouched code — this
diff only edited inside the `setup` branch. Confirmed nothing else broke:
`infra/`'s own `.terraform/terraform.tfstate` (the main app root, a
different Terraform root from `setup/`, already using its real s3 backend
from prior applies) still records `backend.type == "s3"` with the correct
bucket/key after I ran `terraform init -backend=false` there for an offline
`validate` — Terraform treated `-backend=false` as a no-op against an
already-initialized real backend rather than unconfiguring it, and
`terraform validate` passed. No real backend command was run against the
app root state during this check.

## Bootstrap fix: `-backend=false` doesn't satisfy plan/apply, only init

Team lead found the bootstrap branch didn't actually work: `init -backend=false`
reports success, but the following `plan`/`apply` refuse ("Backend
initialization required... use -reconfigure or -migrate-state"). Mechanism:
with a `backend "s3" {}` block present in config but no record of it in
`.terraform/terraform.tfstate`, Terraform treats that as a backend *change*
regardless of `-backend=false` — that flag only skips *writing* the backend
record during `init`, it does not make later commands tolerate the mismatch
between "config says s3" and "no backend confirmed." For a genuinely fresh
account this is unavoidable: `init` with the block present would also try to
reach a bucket that doesn't exist yet. The block has to be **absent from
config**, not merely unused, for the very first apply.

**Fix**: moved the backend block out of `setup/main.tf` into its own
`setup/backend.tf` (comment explaining why moved with it). `deploy.sh`'s
bootstrap branch now renames it aside before the first apply and restores it
before migrating:

```bash
mv backend.tf backend.tf.disabled
trap 'mv -f backend.tf.disabled backend.tf 2>/dev/null || true' EXIT
terraform init -input=false
terraform apply -var-file=../settings.auto.tfvars
mv -f backend.tf.disabled backend.tf
trap - EXIT
terraform init -input=false -migrate-state -force-copy
```

`init` is now plain (no `-backend=false`) in this branch — with the file
genuinely gone there's no backend to skip, so local init just works. The
`trap` restores `backend.tf` even if `apply` fails under `set -e`; cleared
right after the deliberate restore so it doesn't re-fire (harmlessly) on
normal exit. `backend.tf.disabled` is **not** covered by `.gitignore` (only
`*.tfstate*` is) — deliberate: if the trap somehow didn't fire (e.g.
`SIGKILL`), a leftover disabled file shows up in plain `git status` instead
of being silently swallowed.

**Three cases, restated with `backend.tf`'s fate**:

- **(a) fresh account** (no bucket, no object): `head-object` fails outright
  → bootstrap branch. `backend.tf` → `backend.tf.disabled` → plain `init`
  (local, no backend reachable or needed) → `apply` creates the bucket among
  everything else → `backend.tf.disabled` → `backend.tf` (restored) →
  `init -migrate-state -force-copy` moves the fresh local state in.
  `backend.tf` ends present.
- **(b) bucket exists, no object — this repo, right now.** Same path: the
  bucket already existing changes nothing about the backend-block mechanism
  (`-backend=false` was never the problem for the bucket call itself, only
  for the config-vs-record mismatch). `backend.tf` disabled → restored →
  migrate, same as (a). `backend.tf` ends present.
- **(c) bucket and object exist — steady state.** `head-object` succeeds →
  plain `terraform init` (with `backend.tf` present throughout, never
  touched) → `apply`. `backend.tf` is never renamed in this branch.
- **On apply failure in the bootstrap branch** (any case, mid-run): the
  `trap` fires on the subshell's exit, restoring `backend.tf` from
  `backend.tf.disabled` before the script exits, so a failed first run
  leaves the repo with the backend block back in place (and the local state
  still local, not migrated) rather than a disabled-backend file sitting
  around undiscovered.

**Verified, without touching real state:**

- `bash -n deploy.sh` → `SHELL SYNTAX OK`
- Re-extracted bucket/key/region from `backend.tf` (now the source instead
  of `main.tf`): `bucket=mccorlabs-com-tfstate key=setup/terraform.tfstate
  region=us-east-1` — unchanged values, new file.
- `terraform -chdir=setup init -backend=false && terraform -chdir=setup
  validate` → `Success! The configuration is valid.` (with `backend.tf`
  present, i.e. steady-state shape).
- Manually replicated the bootstrap mechanism to confirm the actual fix
  works, not just that it parses: renamed `setup/backend.tf` to
  `backend.tf.disabled`, ran `terraform init -input=false` (succeeded, local
  backend, no AWS backend call), then `AWS_PROFILE=default terraform plan
  -var-file=../settings.auto.tfvars` — **succeeded** this time (`Plan: 56 to
  add, 2 to change, 1 to destroy`, reflecting real drift between this old
  local state and the current mailserver-enabled config — expected, not
  investigated further, no apply run). Confirms plan/apply genuinely work
  once the block is absent, not merely once `-backend=false` is passed.
  Restored `backend.tf` immediately afterward (`mv -f backend.tf.disabled
  backend.tf`), re-ran `init -backend=false` + `validate` to leave the
  directory in its committed, steady-state shape. `git status` after showed
  only the intended diff (`main.tf` modified, `backend.tf` new) — nothing
  stray.
- `terraform fmt -recursive -diff .` from `infra/` → no diff.
- `grep -rn 'backend "s3"'` across `infra/` confirms only two live
  locations: `versions.tf` (the unrelated app root, untouched) and the new
  `setup/backend.tf`. No other file referenced the old in-`main.tf` location
  by path.
- `.terraform/terraform.tfstate` in `setup/` confirmed absent at every check
  point in this round — the real S3 backend was never initialized or
  migrated at any point.

No `terraform apply` or `terraform init -migrate-state` was run against real
state.

## Trap-ordering fix (review Minor)

Review found the `trap` was set one line *after* `mv backend.tf
backend.tf.disabled`, leaving a one-instruction window where a crash or kill
between the rename and the trap would leave `backend.tf.disabled` on disk
with nothing watching it. Moved the `trap '...' EXIT` line to immediately
before the `mv`. Safe to set early: the trap body already carries `2>/dev/null
|| true`, so before the rename happens it just finds no `.disabled` file and
no-ops.

**Verified the reordering actually closes the window**, not just that it
reads correctly: wrote a structural clone of the sequence (`$TMPDIR`, a real
`backend.tf` copy, `trap ... EXIT` then `mv backend.tf backend.tf.disabled`
then an immediate simulated apply failure — the tightest possible gap, one
line) and ran it under `set -euo pipefail`. Result: script exited 1 as
expected, and `backend.tf` was present / `backend.tf.disabled` gone
afterward — the trap fired and restored correctly even with the failure
landing on the very next line after the rename.

Confirmed `trap - EXIT` still sits right after the deliberate restore
(`deploy.sh:108-109`), so the trap doesn't linger and fire again later in
the script.

`bash -n deploy.sh` → `SHELL SYNTAX OK`. `terraform fmt -recursive -diff .`
→ no diff (`deploy.sh` isn't Terraform, expected no-op).

**Second line of defence (review note)**: confirmed by test, not by
inspection — with `backend.tf` genuinely missing, the `BACKEND_BLOCK="$(sed
... backend.tf)"` assignment fails (`sed: backend.tf: No such file or
directory`), and because it's a plain command substitution assignment (not
inside an `if`/`while`), `set -e` aborts the script right there with exit 1
— *before* the `-z` guard a few lines down is even reached. So the real
backstop is `set -e` catching the failed `sed`, with the `-z` check as a
second layer behind that for the case where `sed` succeeds but returns
nothing (e.g. a backend block with unexpected formatting). This wasn't
designed as a deliberate belt-and-suspenders layer under the trap — it falls
out of already having `set -e` and reading the block via a plain
assignment — but it's real and I added a comment at `deploy.sh:53-57`
recording it, so nobody mistakes it for dead code and removes it.

## Backup-cp guard fix (review Minor, addendum to the trap fix)

Same review: the pre-migrate backup `cp terraform.tfstate
terraform.tfstate.pre-migrate.<ts> 2>/dev/null || true` swallowed every
failure indiscriminately. The suppression exists for a legitimate case (no
local state yet on a genuinely fresh account), but its blanket form also
hides a disk-full or permissions error, letting the script proceed straight
into `-migrate-state -force-copy` with no safety copy — silently defeating
the backup's entire purpose.

**Fix**: replaced the suppressed `cp` with a precise guard:

```bash
if [[ -f terraform.tfstate ]]; then
  cp terraform.tfstate "terraform.tfstate.pre-migrate.$(date +%Y%m%d-%H%M%S)"
fi
```

A missing file is now handled by the `[[ -f ]]` check (the legitimate
fresh-account case), while a real `cp` failure is no longer swallowed and
aborts the script under `set -e`, before anything touches state.

**Verified both branches empirically** (structural tests, `$TMPDIR`, not
against the real repo):

- Fresh-account case: ran the guard against a directory with no
  `terraform.tfstate` present → script continued past the backup step,
  exit 0. Confirms a fresh account doesn't spuriously abort.
- Failing-copy case: created a real `terraform.tfstate`, pointed the backup
  target at a permission-denied directory → `cp` failed
  (`Permission denied`) and the script aborted, exit 1, before reaching
  anything past the backup line. Confirms a real backup failure now stops
  the run instead of silently proceeding with no safety copy.

`bash -n deploy.sh` → `SHELL SYNTAX OK`.

This addendum was requested to land in the same commit as the trap-ordering
fix; that fix was already committed (`e96e42c`) by the time this request
arrived, so it's a separate commit instead (`<see below>`) rather than an
amend — per my standing instructions I don't amend prior commits absent an
explicit ask to do so, and the work is otherwise identical to what was
requested.
