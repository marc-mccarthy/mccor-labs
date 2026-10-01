# Task 1 & 2 Report

## Task 1: Validate configuration inputs

**Changes:**
- `infra/setup/main.tf:54-61` — `variable "domain_name"` already had `validation { condition = length(var.domain_name) > 0 }` (pre-existing, confirmed present).
- `infra/setup/main.tf:63-72` — `variable "alert_email"` already had the same non-blank validation (pre-existing, confirmed present).
- `infra/setup/main.tf:114-123` — `variable "admin_mailbox"` already had `validation { condition = !var.enable_mailserver || contains(keys(var.mailboxes), var.admin_mailbox) }` (pre-existing, confirmed present).
- `infra/setup/main.tf:108-116` — Added new validation block to `variable "mailboxes"`:
  ```hcl
  validation {
    condition     = !var.enable_mailserver || length(var.mailboxes) > 0
    error_message = "enable_mailserver is true but mailboxes is empty. A mail server with no mailboxes accepts mail it cannot deliver."
  }
  ```
- `infra/settings.auto.tfvars.example` — verified only, no changes needed; already documents all fields correctly.

**Ruling applied:** R1 — Step 4's command used `-var project=validname` instead of the brief's `-var project=x`, since `x` fails `project`'s own regex (`^[a-z][a-z0-9-]{1,18}[a-z0-9]$`, needs 3-20 chars) and would produce a spurious 3rd error, breaking the exact `grep -c` count of 2.

**Commands and output:**

```
$ cd /Users/mj/repos/mccor-labs/infra && terraform fmt -recursive && terraform -chdir=setup validate -no-color
Success! The configuration is valid.
```

Step 4 (blank domain_name and alert_email):
```
$ cd /Users/mj/repos/mccor-labs/infra/setup
$ AWS_PROFILE=default terraform plan -no-color -input=false \
    -var domain_name= -var alert_email= -var project=validname 2>&1 | grep -c "is blank"
2
```
Context:
```
    │ var.domain_name is ""
domain_name is blank. Copy settings.auto.tfvars.example and fill it in.
--
    │ var.alert_email is ""
alert_email is blank. Copy settings.auto.tfvars.example and fill it in.
```

Step 5 (bad admin_mailbox):
```
$ AWS_PROFILE=default terraform plan -no-color -input=false \
    -var-file=../settings.auto.tfvars -var enable_mailserver=true -var admin_mailbox=nobody 2>&1 \
    | grep -c "admin_mailbox must name"
1
```
Context:
```
    │ var.mailboxes is map of string with 4 elements
admin_mailbox must name one of the mailboxes. Left to chance it falls to
```

No credential flakes encountered on either plan run (each succeeded on first attempt; retry loop of up to 4 attempts was in place but not needed).

**Commit:**
```
$ cd /Users/mj/repos/mccor-labs && git add infra/setup/main.tf infra/settings.auto.tfvars.example && git commit -m "feat(infra): validate mail configuration inputs"
[feat/mail-server 6756a3f] feat(infra): validate mail configuration inputs
 2 files changed, 386 insertions(+)
 create mode 100644 infra/settings.auto.tfvars.example
 create mode 100644 infra/setup/main.tf
```
Commit SHA: `6756a3f`

(Note: `git status` before this commit showed the working tree had many other untracked files from the broader mail-server feature branch — e.g. `infra/main.tf`, `infra/modules/`, `infra/deploy.sh` — which were left untouched and unstaged, per instructions to only stage the files this task specifies.)

---

## Task 2: Harden the instance — IMDSv2, CPU credits, AMI drift

**Changes:**
- `infra/modules/mailserver/main.tf:285-306` (after the edit; originally ~line 256-283 for the resource block) — Added three blocks to `resource "aws_instance" "mail"`, inserted after the `user_data` argument and before the `tags` argument:
  ```hcl
  metadata_options {
    http_tokens                 = "required"
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 1
  }

  credit_specification {
    cpu_credits = "standard"
  }

  lifecycle {
    ignore_changes = [ami]
  }
  ```
  Each preceded by the exact WHY comments specified in the brief (containers/IMDSv2 hop limit, T-series CPU credit billing risk, AMI drift on `most_recent` datasource).

**Commands and output:**

```
$ cd /Users/mj/repos/mccor-labs/infra && terraform fmt -recursive && terraform -chdir=setup validate -no-color
Success! The configuration is valid.
```

Step 3 (attributes appear in plan):
```
$ cd /Users/mj/repos/mccor-labs/infra/setup
$ AWS_PROFILE=default terraform plan -no-color -input=false \
    -var-file=../settings.auto.tfvars -var enable_mailserver=true \
    | grep -E 'http_tokens|hop_limit|cpu_credits'
          + cpu_credits = "standard"
          + http_put_response_hop_limit = 1
          + http_tokens                 = "required"
```
All three expected lines present. No credential flakes encountered.

**Commit:**
```
$ cd /Users/mj/repos/mccor-labs && git add infra/modules/mailserver/main.tf && git commit -m "fix(mailserver): require IMDSv2, fix CPU credits to standard, ignore AMI drift"
[feat/mail-server bbebc45] fix(mailserver): require IMDSv2, fix CPU credits to standard, ignore AMI drift
 1 file changed, 371 insertions(+)
 create mode 100644 infra/modules/mailserver/main.tf
```
Commit SHA: `bbebc45`

---

## Summary

Both tasks complete, both `terraform plan` proofs matched expected output exactly, `terraform fmt -recursive` passed before each commit, no `terraform apply` was run at any point, all commands used `AWS_PROFILE=default` and `dangerouslyDisableSandbox: true` per instructions.
