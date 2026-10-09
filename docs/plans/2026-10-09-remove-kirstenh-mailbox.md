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
- The 1Password item `Development/mccor-labs/mailboxes` holds each user's password, including
  `kirstenh`.
- Shell access is `aws ssm start-session --target <mail_instance_id>`.

## Steps

Each step is run by the owner or with the owner's explicit go-ahead. Nothing here runs automatically.

1. **Decide what happens to her stored mail.** Either export it first (IMAP copy from her account,
   or a tarball of `/var/mail-data/mail-data/mccorlabs.com/kirstenh/` taken over SSM), or accept
   that it is deleted in step 5. The latest volume snapshot also holds it until that snapshot ages
   out.
2. **Edit the 1Password field behind `TF_VAR_mailboxes`** to drop the `kirstenh` entry. Leave
   `admin_mailbox` as `marcm`.
3. **Plan.** Run `infra/deploy.sh` in plan mode, or `op run --env-file=app.env -- terraform
-chdir=infra plan`. The only destroys must be `module.mailserver[0].random_password.mailbox["kirstenh"]`
   and `module.mailserver[0].aws_ssm_parameter.mailbox["kirstenh"]`. Stop if the plan touches the
   instance, the volume, or any other mailbox.
4. **Apply** through `infra/deploy.sh` (or the deploy workflow), which keeps its existing guards.
5. **Remove the account on the server.** Over SSM:
   `sudo docker exec mailserver setup email del kirstenh@mccorlabs.com`. Check `setup help` on
   the running 16.0.1 image first to confirm the flag that also deletes the maildir. Then confirm
   `grep -c '|' /var/mail-data/config/postfix-accounts.cf` reports 4.
6. **Verify the address is dead.** Send a test message to `kirstenh@mccorlabs.com` from an outside
   account and confirm it bounces with "user unknown". Confirm IMAP login as `kirstenh` fails.
7. **Remove her entry from the 1Password `mailboxes` item** so the password is not left behind.
8. **Update `docs/plans/ci-terraform-apply.md:855`** to list four users.

## Follow-up worth doing

`sync-accounts.sh` should remove accounts that no longer have an SSM parameter, so the next removal
is one Terraform change instead of a manual server step. That is a code change to
`setup.sh.tftpl` with its own test, done separately.

## Rulings

- Ruling: remove the account by hand on the server instead of rebuilding the instance (cost if
  wrong: the account survives a later rebuild only if SSM still has it, which step 3 removes).
- Ruling: her stored mail is the owner's call in step 1, not a default (cost if wrong: mail the
  owner wanted is gone once the snapshot ages out).
- Ruling: the pruning fix in `sync-accounts.sh` is a separate change (cost if wrong: one more
  manual step if another mailbox is removed before it lands).
