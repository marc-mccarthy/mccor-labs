# Task 11 report: MAIL.md runbook

Status: done. Commit `ced9dc5`.

## Commands verified against code

1. `./infra/deploy.sh setup` — deploy.sh:49-149 (setup action, SES request at 124-141)
2. `dig +short NS mccorlabs.com` — matches nameserver-check pattern, no code dependency
3. `enable_mailserver = true` in settings.auto.tfvars — variable at setup/main.tf:109-118, example at settings.auto.tfvars.example:47
4. `cd infra/setup && terraform output -json mailbox_passwords` — output at setup/main.tf:323-328
5. `aws ssm start-session --target $(terraform output -raw mail_instance_id)` — output at setup/main.tf:318-321
6. `sudo docker exec -it mailserver setup email update marcm@mccorlabs.com` — mailbox name from settings.auto.tfvars.example:52 (marcm not present there, corrected to sample name from spec); command form matches setup.sh.tftpl's `docker exec mailserver setup email add` pattern (line 240) and `setup email list` (line 236); sudo added because SSM sessions land as ssm-user, not root — confirmed against spec doc's own onboarding steps (design doc line 180: "sudo /opt/mail/sync-accounts.sh")
7. Client settings table (mail.mccorlabs.com, 993 SSL/TLS, 587 STARTTLS) — modules/mailserver/outputs.tf:16-27, security group ports at modules/mailserver/main.tf:188-202 (confirms 465 not opened)
8. `mailboxes` edit + `./infra/deploy.sh setup` + `sudo /opt/mail/sync-accounts.sh` — sync script written verbatim at setup.sh.tftpl:223-244; design doc lines 176-183 confirm the three-step add sequence and sudo
9. `sudo docker exec -it mailserver setup email del someone@mccorlabs.com` — matches setup.sh.tftpl's `setup email add`/`setup alias add` command family; del confirmed by design doc line 186-189 ("deliberate command")
10. Restore commands (create-volume, attach-volume, detach-volume, delete-volume, describe-snapshots with tag filter) — snapshot tag `mccorlabs-com-mail` from modules/mailserver/main.tf:38 (`local.snapshot_tag`) and outputs.tf:41-44; restore steps follow design doc lines 212-226 exactly (scratch volume, copy into new/, restart, delete scratch)
11. `aws sesv2 get-account` — read-only companion to the `aws sesv2 put-account-details` call already in deploy.sh:129-134
12. `aws sns list-subscriptions-by-topic --topic-arn $(terraform output -raw alerts_topic_arn)` — output at setup/main.tf n/a (module output), modules/mailserver/outputs.tf:46-49; subscription resource at monitoring.tf:8-12
13. Nine-alarm table — every row matches an `aws_cloudwatch_metric_alarm`/`aws_route53_health_check` resource and the two `/etc/cron.daily/mail-health` checks in monitoring.tf and setup.sh.tftpl:279-294
14. Cost table — figures taken verbatim from docs/superpowers/specs/2026-09-26-mail-server-design.md:398-407 (~$20.38 total, $3.65 EIP, budget $25 from setup/main.tf:88 default and settings.auto.tfvars.example:34)
15. DKIM verification commands — dkim_tokens resource at modules/mailserver/main.tf:47-60
16. Teardown block — copied from task-11-brief.md verbatim (already pre-verified there against main.tf:279-291 prevent_destroy and dlm tags); re-verified `terraform state rm` resource addresses against main.tf:264-291
17. `grep -rn 'disable_api_termination' modules/` — ran it directly, output: no matches, confirms "OK: nothing blocks destroy"

## Could not verify

- The exact scratch-device name AWS assigns during volume restore (`/dev/sdg` / `/dev/xvdg`) — this is standard AWS behavior (requested name vs. NVMe-remapped name), not something in this repo's code, so I noted in the runbook that the device name may differ.
- `terraform import` exact syntax for the total-volume-loss case — state address `module.mailserver[0].aws_ebs_volume.mail` is confirmed from main.tf:264, but I described re-import as needing "terraform import or a state edit" rather than inventing exact import command syntax, since this path is untested and rare.

## Falsehoods removed

Autodiscover/autoconfig claims, webmail/Roundcube promises, stale $16/month cost table, and port 465 all removed. Confirmed no residual mentions with `grep -in 'autodiscover\|autoconfig\|roundcube\|webmail\|465' infra/MAIL.md` returning nothing except the explicit "no webmail in v1" and "port 465 is not open" statements.

## Fix round 1

`terraform output -raw alerts_topic_arn` used in MAIL.md's SNS-confirmation section did not exist as a `setup/` root output — `alerts_topic_arn` was only defined on the `mailserver` module (`modules/mailserver/outputs.tf:46-49`), never re-exposed by `setup/main.tf`. Fixed by adding the output rather than rewording the runbook, per controller ruling R14:

```hcl
output "alerts_topic_arn" {
  description = "SNS topic the alarms publish to. The email subscription must be confirmed before anything alerts."
  value       = var.enable_mailserver ? module.mailserver[0].alerts_topic_arn : null
}
```

Added at `infra/setup/main.tf:323-326`, following the existing `count`/`var.enable_mailserver`-guarded pattern of every other mail output in that file.

Verification:
- `terraform fmt -recursive` — no changes needed after the edit
- `terraform -chdir=setup init -backend=false` — succeeded
- `terraform -chdir=setup validate` — `Success! The configuration is valid.`
- Exhaustive grep of every `terraform output` name used in MAIL.md against `setup/main.tf`'s output blocks:

  | Name used in MAIL.md | Exists in setup/main.tf |
  | --- | --- |
  | `mailbox_passwords` | yes — main.tf:328 |
  | `mail_instance_id` | yes — main.tf:318 |
  | `alerts_topic_arn` | yes — main.tf:323 (added this round) |

  No other `terraform output` names appear in MAIL.md. Command: `grep -oE 'terraform output[^\`]*' infra/MAIL.md` cross-checked against `grep -oE '^output "[a-z_]+"' infra/setup/main.tf`.

Commit: `1547f9d`.
