# Remove the kirstenh mailbox

## Goal

Kirsten H. is no longer on the team. Remove `kirstenh@mccorlabs.com` from the mail server so the
address stops accepting mail, and remove every config and secret that still names it. Site content
and `docs/content/team.md` are already done on `feat/team-portraits`.

## What exists today (from `main`)

- The mailbox list is `TF_VAR_mailboxes` in `app.env`, an `op://Development/mccor-labs/...`
  reference. It is a map of local part to display name.
- `infra/modules/mailserver/main.tf:65-81` turns each key into a `random_password.mailbox[...]` and
  an `aws_ssm_parameter.mailbox[...]` under the mail parameter prefix.
- `infra/variables.tf:58-64` requires `admin_mailbox` to be a key in `mailboxes`. The admin is
  `marcm`, so removing `kirstenh` passes that check.
- On the instance, `/opt/mail/sync-accounts.sh` (from `setup.sh.tftpl:220-268`) reads SSM and only
  adds accounts or changes passwords. It never removes an account. Deleting the SSM parameter alone
  leaves `kirstenh@` working on the server with its last password.
- Mail is stored on the `maildata` volume at `/var/mail-data/mail-data/` (container `/var/mail/`),
  and the module snapshots that volume (`snapshot_tag` output).
- `op://Development/mccor-labs/mailboxes` is that map of names, not passwords. Passwords are
  `random_password` values Terraform writes to SSM (`docs/plans/ci-terraform-apply.md:855`).
- Shell access is `aws ssm start-session --target <mail_instance_id>`.

## Steps

Each step is run by the owner or with the owner's explicit go-ahead. Nothing here runs automatically.
The owner decided on 2026-10-09 that her stored mail is deleted, not exported.

The `fix/mail-prune-accounts` branch makes `sync-accounts.sh` remove accounts whose SSM parameter is
gone, refuse to run when SSM cannot be read, and refuse to prune when SSM lists no mailboxes. It also
allowlists the four deletions this removal needs. Because `user_data_replace_on_change = true`
(`infra/modules/mailserver/main.tf:250`), deploying it replaces the mail instance; the mail volume and
its config persist, and the new instance prunes `kirstenh` on its first sync.

1. **Edit `op://Development/mccor-labs/mailboxes`** (vault Development, item mccor-labs, field
   mailboxes) to drop the `kirstenh = "Kirsten H"` entry. Leave
   `admin_mailbox` as `marcm`. Do this before step 3, or the deploy keeps her mailbox.
2. **Review the PR for `fix/mail-prune-accounts`** and its CI.
3. **Merge it.** The deploy workflow runs on push to `main`. Its plan must delete or replace only
   `module.mailserver[0].aws_instance.mail`, `module.mailserver[0].aws_volume_attachment.mail`,
   `module.mailserver[0].aws_ssm_parameter.mailbox["kirstenh"]` and
   `module.mailserver[0].random_password.mailbox["kirstenh"]`; `scripts/plan-guard.sh` blocks
   anything else. Expect a few minutes without mail while the new instance boots.
4. **Confirm the prune.** Over `aws ssm start-session --target <mail_instance_id>`:
   `sudo grep -c '|' /var/mail-data/config/postfix-accounts.cf` reports 4, and
   `sudo /opt/mail/sync-accounts.sh` prints no `added`, `removed` or `updated` line.
5. **Delete her stored mail.** `sudo rm -rf /var/mail-data/mail-data/mccorlabs.com/kirstenh`.
   The latest volume snapshot still holds it until that snapshot ages out.
6. **Verify the address is dead.** Send a test message to `kirstenh@mccorlabs.com` from an outside
   account and confirm it bounces with "user unknown". Confirm IMAP login as `kirstenh` fails.
7. **Empty `infra/destroy-allowlist.txt`** and update `docs/plans/ci-terraform-apply.md:855` to
   list four users, in one follow-up commit.

## Rulings

- Ruling: remove her through the pruning sync on a replaced instance, not by hand on the server
  (cost if wrong: a few minutes of mail downtime during the replacement).
- Ruling: her stored mail is deleted, per the owner (cost if wrong: mail is gone once the latest
  snapshot ages out).
- Ruling: the sync refuses to prune when SSM is unreadable or empty (cost if wrong: a broken SSM
  read leaves stale accounts until it is fixed, instead of wiping every account).
