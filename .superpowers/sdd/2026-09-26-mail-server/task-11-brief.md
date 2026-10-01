## Task 11: Runbook and teardown

**Files:**
- Rewrite: `infra/MAIL.md`

**Interfaces:**
- Consumes: outputs from `setup/`.
- Produces: documentation only.

- [ ] **Step 1: Rewrite MAIL.md**

It must cover, with literal commands: the three-stage rollout (setup →
registrar nameservers → `enable_mailserver = true`); reading passwords via
`terraform output -json mailbox_passwords`; IMAP/SMTP client settings
(`mail.mccorlabs.com`, 993 SSL/TLS, 587 STARTTLS, username is the full
address); that **there is no webmail in v1**; adding a person (edit
`mailboxes`, apply, SSM in, run `/opt/mail/sync-accounts.sh`); removing a
person (`docker exec mailserver setup email del`); restoring one message;
restoring from total loss; the SES sandbox wait; and the deliverability
test plan (mail-tester.com, Gmail "show original" showing
`dkim=pass header.d=mccorlabs.com`).

Delete every stale claim, in particular any suggestion that clients
auto-configure.

- [ ] **Step 2: Document teardown, and verify nothing blocks it**

This is Review Focus item 5. Add to `MAIL.md`:

````markdown
## Tearing it down

`prevent_destroy` on the mail volume aborts the WHOLE destroy, not just
itself. To remove everything on purpose:

```bash
cd infra/setup
terraform state rm 'module.mailserver[0].aws_volume_attachment.mail'
terraform state rm 'module.mailserver[0].aws_ebs_volume.mail'
terraform destroy -var-file=../settings.auto.tfvars

# The volume and its snapshots survive deliberately. Remove them last:
aws ec2 delete-volume --volume-id <vol-id>
aws ec2 describe-snapshots --owner-ids self \
  --filters Name=tag:Backup,Values=mccorlabs-com-mail \
  --query 'Snapshots[].SnapshotId' --output text \
  | tr '\t' '\n' | xargs -rn1 aws ec2 delete-snapshot --snapshot-id

# To destroy the state bucket, migrate setup's own state back to local first:
#   comment out the backend block, then: terraform init -migrate-state
```

Nothing else survives. Custom CloudWatch metrics stop being published and
cost nothing; SES production access and its suppression list persist and
are free.
````

Verify no flag blocks destroy:

```bash
cd /Users/mj/repos/mccor-labs/infra
grep -rn 'disable_api_termination' modules/ || echo "OK: nothing blocks destroy"
```

Expected: `OK: nothing blocks destroy`.

- [ ] **Step 3: Commit**

```bash
cd /Users/mj/repos/mccor-labs
git add infra/MAIL.md
git commit -m "docs(mail): runbook for rollout, client setup, restore and teardown"
```

---

