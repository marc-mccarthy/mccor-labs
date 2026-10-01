# Task 4 Report: sync mailboxes from SSM at run time

Commit: `e0d5d35` — feat(mailserver): sync mailboxes from SSM so adding a person never replaces the instance

## Changes

`infra/modules/mailserver/main.tf`: removed `mailbox_names = join(" ", sort(keys(var.mailboxes)))`
from the `templatefile()` arguments for `aws_instance.mail.user_data`.

`infra/modules/mailserver/templates/setup.sh.tftpl`: removed `MAILBOXES="${mailbox_names}"`, and
replaced the `for NAME in $MAILBOXES; do ... done` account-creation loop with a script written to
`/opt/mail/sync-accounts.sh` on the box, then invoked once at the end of boot (and safe to re-run
any time, e.g. from cron or manually over SSM).

## IAM

Verified before writing anything: `data.aws_iam_policy_document.instance` in main.tf (lines 221-226,
pre-existing) already grants `ssm:GetParameter` and `ssm:GetParametersByPath` on
`arn:aws:ssm:<region>:*:parameter/<domain>/mail/*`. No permission changes needed for the sync
script's `aws ssm get-parameters-by-path`.

## The escaping fix

The brief's draft escaped runtime variables inside an **unquoted** heredoc (`<<SYNC`) with layered
backslashes (`\\\${NAME##*/}`, `\\\$LOCAL`, etc.). That's fragile and, when I traced it through by
hand, doesn't actually null out — an unquoted heredoc still asks bash to evaluate escapes at
boot-script-write-time, and getting the backslash count right for both the Terraform layer and the
bash layer at once is exactly the kind of thing that silently breaks at 3am.

Instead I used a **quoted heredoc delimiter**: `cat > /opt/mail/sync-accounts.sh <<'SYNC'`. With the
delimiter quoted, bash performs *no* expansion at all when writing the file — the body is copied
byte-for-byte. That fully separates the two substitution passes:

- **Terraform** (plan time) only ever sees `${region}`, `${param_prefix}`, `${domain}` — plain,
  unescaped, exactly like every other Terraform value already used elsewhere in this file.
- **Bash, at heredoc-write time** (instance boot) does nothing to the body, so `$NAME`, `$PASS`,
  `$LOCAL`, `$ADDR` and the parameter expansion `${NAME##*/}` land in `sync-accounts.sh` untouched.
- **Bash, when `sync-accounts.sh` itself runs** (boot, and every later invocation) expands all of
  those normally.

The one wrinkle: `${NAME##*/}` uses `${...}`, which is *also* Terraform's interpolation syntax. Left
unescaped, `templatefile()` tries to parse `NAME##*/` as an HCL expression and fails at plan time
(caught this directly — see Verification below). Fixed by doubling the leading `$`: `$${NAME##*/}`
in the source `.tftpl`, which Terraform's template language treats as an explicit escape and emits
as a literal single `$`. Since the heredoc is quoted, bash never touches it either, so it reaches
the file as literal `${NAME##*/}`.

This pattern already exists once in the same file for a different reason — the certbot renewal hook
uses `<<'HOOK'` for the same "keep it literal" purpose, while `compose.yaml` uses an **unquoted**
`<<COMPOSE` on purpose, because it deliberately wants `$FQDN`/`$RELAY_USER`/`$RELAY_PASSWORD`/`$REGION`
(already-set bash variables) substituted in at boot time. The sync script is closer to the HOOK case,
just with one Terraform value along for the ride, hence quoted heredoc + a genuine `${...}`
Terraform substitution outside it.

Also found and fixed one thing the brief's own draft would have broken independently: the new code
comment above the heredoc used unescaped `${NAME##*/}`, `${region}`, etc. in **prose**. Terraform's
templatefile function scans the whole file byte-for-byte for `${` — including inside `#` comments —
so this alone caused the same HCL parse failure. Comments were reworded without any `${...}` tokens.

## Rendered sync script (verbatim)

Produced by actually invoking `templatefile()` (via a scratch Terraform config calling the real
`.tftpl` file with test values) and then literally executing the heredoc-writing portion of the
rendered `setup.sh` in a real shell, to get exactly what would land on disk at `/opt/mail/sync-accounts.sh`:

```bash
#!/usr/bin/env bash
# Creates any mailbox that exists in Parameter Store but not yet on this
# server. Safe to re-run. Never deletes: removing someone is deliberate.
set -euo pipefail

aws ssm get-parameters-by-path --region us-east-1 --path /mccorlabs.com/mail \
    --with-decryption --query 'Parameters[].[Name,Value]' --output text |
while read -r NAME PASS; do
  LOCAL="${NAME##*/}"
  # Names beginning with _ are not mailboxes (_relay_password).
  case "$LOCAL" in _*) continue ;; esac
  ADDR="$LOCAL@mccorlabs.com"
  if docker exec mailserver setup email list 2>/dev/null | grep -q "^\* $ADDR"; then
    continue
  fi
  echo "creating $ADDR"
  docker exec mailserver setup email add "$ADDR" "$PASS"
done
```

`region`, `param_prefix`, `domain` came from Terraform exactly as intended; `NAME`, `PASS`, `LOCAL`,
`ADDR`, and the `${NAME##*/}` expansion all survived as live shell syntax, untouched, ready to
evaluate for real when this script executes on the box.

## Verification

**Step 4/rendered-script syntax** — did this two ways, both passing:

1. `bash -n` on the *entire* rendered `setup.sh` (all placeholders substituted with test values via
   a scratch `templatefile()` call): `FULL SCRIPT SYNTAX OK`.
2. Actually executed the heredoc-writing block of the rendered script in a real shell to produce the
   file bash would write on the box, then `bash -n` on *that* output: `SYNC SCRIPT SYNTAX OK`.

This caught the comment-escaping bug (Terraform parse error on `${NAME##*/}` inside the `#` comment,
"Single quotes are not valid" pointed at the wrong line but was caused by an unterminated
interpolation opened earlier) before it ever reached a real plan.

**Step 5** — `terraform fmt -recursive` clean; `terraform -chdir=setup validate -no-color` →
`Success! The configuration is valid.`

**Step 6** — could not run the brief's exact command as a meaningful test: `terraform state list`
shows the mailserver module has never been applied in this account (`enable_mailserver` currently
off), so a plan with either 4 or 5 mailboxes shows `aws_instance.mail` as `will be created` in
*both* cases — there's no prior state to diff against, so the literal grep isn't evidence either
way here.

Instead I compared the two plans' *planned `user_data` value* directly, which is the thing that
actually drives `user_data_replace_on_change`:

```
terraform plan ... -var 'mailboxes={4 entries}' -out plan4.tfplan
terraform plan ... -var 'mailboxes={5 entries, adds newhire}' -out plan5.tfplan
terraform show -json plan4.tfplan | jq -like-extract aws_instance.mail.values.user_data > ud4.txt
terraform show -json plan5.tfplan | jq -like-extract aws_instance.mail.values.user_data > ud5.txt
diff ud4.txt ud5.txt
```

Result: **`user_data` is byte-for-byte identical** between the 4-mailbox and 5-mailbox plans. That's
the direct proof the task requires: once this module is applied, adding `newhire` to `var.mailboxes`
cannot change `aws_instance.mail`'s `user_data`, so `user_data_replace_on_change` cannot fire, and
Terraform would show zero diff on the instance for that change — only the new
`random_password.mailbox["newhire"]` and `aws_ssm_parameter.mailbox["newhire"]` resources, which the
5-mailbox plan does show being created (confirmed via the brief's own grep pattern too, for the
record — it lists `aws_instance.mail` only because the whole module doesn't exist in state yet, not
because of the mailbox list).

## Concerns for review

- Step 6 as literally written in the brief can't be exercised in this account until the mailserver
  module has been applied at least once with 4 mailboxes and a real state file exists. The user_data
  diff I ran instead proves the same thing more directly (it's what the instance's replace-on-change
  trigger actually keys off), but flagging the gap so review knows why the exact grep transcript
  isn't in this report.
- IAM was verified read-only (no changes); if a future change narrows `aws_iam_role_policy.instance`
  it should keep `ssm:GetParametersByPath` since `sync-accounts.sh` relies on it, not just
  `GetParameter`.
