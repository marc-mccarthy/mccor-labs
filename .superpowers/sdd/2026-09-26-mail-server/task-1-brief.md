## Task 1: Validate configuration inputs

Guards against a fresh clone deploying placeholder values, and against
`admin_mailbox` pointing at nobody.

**Files:**
- Modify: `infra/setup/main.tf` (variable blocks, lines ~45-137)
- Verify: `infra/settings.auto.tfvars.example`

**Interfaces:**
- Consumes: nothing.
- Produces: `var.admin_mailbox` (string, validated to be a key of
  `var.mailboxes` when `enable_mailserver` is true).

- [ ] **Step 1: Confirm the validations already added are present**

```bash
cd /Users/mj/repos/mccor-labs/infra
grep -A4 'variable "domain_name"' setup/main.tf
grep -A6 'variable "alert_email"' setup/main.tf
grep -A8 'variable "admin_mailbox"' setup/main.tf
```

Expected: each shows a `validation` block. If any is missing, add it —
`domain_name` and `alert_email` require `length(var.x) > 0`;
`admin_mailbox` requires
`!var.enable_mailserver || contains(keys(var.mailboxes), var.admin_mailbox)`.

- [ ] **Step 2: Add a validation that mailboxes is non-empty when enabled**

In `infra/setup/main.tf`, inside `variable "mailboxes"`:

```hcl
  validation {
    condition     = !var.enable_mailserver || length(var.mailboxes) > 0
    error_message = "enable_mailserver is true but mailboxes is empty. A mail server with no mailboxes accepts mail it cannot deliver."
  }
```

- [ ] **Step 3: Format and validate**

```bash
cd /Users/mj/repos/mccor-labs/infra
terraform fmt -recursive
terraform -chdir=setup validate -no-color
```

Expected: `Success! The configuration is valid.`

- [ ] **Step 4: Prove blank inputs fail fast**

```bash
cd /Users/mj/repos/mccor-labs/infra/setup
AWS_PROFILE=default terraform plan -no-color -input=false \
  -var domain_name= -var alert_email= -var project=x 2>&1 | grep -c "is blank"
```

Expected: `2` — both validations fire.

- [ ] **Step 5: Prove a bad admin_mailbox fails**

```bash
cd /Users/mj/repos/mccor-labs/infra/setup
AWS_PROFILE=default terraform plan -no-color -input=false \
  -var-file=../settings.auto.tfvars \
  -var enable_mailserver=true -var admin_mailbox=nobody 2>&1 | grep -c "admin_mailbox must name"
```

Expected: `1`.

- [ ] **Step 6: Commit**

```bash
cd /Users/mj/repos/mccor-labs
git add infra/setup/main.tf infra/settings.auto.tfvars.example
git commit -m "feat(infra): validate mail configuration inputs"
```

---

