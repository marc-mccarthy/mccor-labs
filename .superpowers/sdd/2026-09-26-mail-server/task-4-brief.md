## Task 4: Add a mailbox without replacing the instance

Currently the mailbox list is templated into user-data and
`user_data_replace_on_change = true`, so hiring someone terminates and
rebuilds the mail server. This is the most-performed operation in the
system.

**Files:**
- Modify: `infra/modules/mailserver/main.tf` (templatefile args)
- Modify: `infra/modules/mailserver/templates/setup.sh.tftpl` (remove
  `MAILBOXES`, add the sync script)

**Interfaces:**
- Consumes: `var.domain_name`, `data.aws_region.current.region`,
  the SSM path prefix `/<domain>/mail`.
- Produces: `/opt/mail/sync-accounts.sh` on the instance.

- [ ] **Step 1: Remove `mailbox_names` from the templatefile map**

Delete this line from `aws_instance.mail`'s `templatefile` arguments:

```hcl
    mailbox_names = join(" ", sort(keys(var.mailboxes)))
```

- [ ] **Step 2: Remove the MAILBOXES variable from the script**

In `setup.sh.tftpl`, delete:

```bash
MAILBOXES="${mailbox_names}"
```

- [ ] **Step 3: Replace the account-creation loop with a sync script**

Replace the `for NAME in $MAILBOXES; do ... done` block with:

```bash
# ---------- the people ----------
# Mailboxes are read from Parameter Store at run time rather than baked
# into user-data. Templating them in would mean every new hire replaces
# the instance, since user_data_replace_on_change is set.
cat > /opt/mail/sync-accounts.sh <<SYNC
#!/usr/bin/env bash
# Creates any mailbox that exists in Parameter Store but not yet on this
# server. Safe to re-run. Never deletes: removing someone is deliberate.
set -euo pipefail

aws ssm get-parameters-by-path --region ${region} --path ${param_prefix} \\
    --with-decryption --query 'Parameters[].[Name,Value]' --output text |
while read -r NAME PASS; do
  LOCAL="\\\${NAME##*/}"
  # Names beginning with _ are not mailboxes (_relay_password).
  case "\\\$LOCAL" in _*) continue ;; esac
  ADDR="\\\$LOCAL@${domain}"
  if docker exec mailserver setup email list 2>/dev/null | grep -q "^\\* \\\$ADDR"; then
    continue
  fi
  echo "creating \\\$ADDR"
  docker exec mailserver setup email add "\\\$ADDR" "\\\$PASS"
done
SYNC
chmod +x /opt/mail/sync-accounts.sh
/opt/mail/sync-accounts.sh
```

- [ ] **Step 4: Check rendered shell syntax**

```bash
cd /Users/mj/repos/mccor-labs/infra
sed -e 's/\${[a-z_]*}/x/g' modules/mailserver/templates/setup.sh.tftpl > "$TMPDIR/r.sh"
bash -n "$TMPDIR/r.sh" && echo "SHELL SYNTAX OK"
```

Expected: `SHELL SYNTAX OK`.

- [ ] **Step 5: Validate**

```bash
cd /Users/mj/repos/mccor-labs/infra
terraform fmt -recursive && terraform -chdir=setup validate -no-color
```

Expected: `Success! The configuration is valid.`

- [ ] **Step 6: Prove adding a mailbox does not touch the instance**

This is Review Focus item 1. Compare the plan with four mailboxes against
the plan with five:

```bash
cd /Users/mj/repos/mccor-labs/infra/setup
AWS_PROFILE=default terraform plan -no-color -input=false \
  -var-file=../settings.auto.tfvars -var enable_mailserver=true \
  -var 'mailboxes={marcm="Marc M",nateb="Nate B",kirstenh="Kirsten H",ashleyt="Ashley T",newhire="New Hire"}' \
  | grep -E 'aws_instance|random_password|aws_ssm_parameter' | sort | uniq
```

Expected: `random_password.mailbox["newhire"]` and
`aws_ssm_parameter.mailbox["newhire"]` created; **no line containing
`aws_instance.mail`**. If `aws_instance.mail` appears, user-data still
depends on the mailbox list — go back to Step 1.

- [ ] **Step 7: Commit**

```bash
cd /Users/mj/repos/mccor-labs
git add infra/modules/mailserver/main.tf infra/modules/mailserver/templates/setup.sh.tftpl
git commit -m "feat(mailserver): sync mailboxes from SSM so adding a person never replaces the instance"
```

---

