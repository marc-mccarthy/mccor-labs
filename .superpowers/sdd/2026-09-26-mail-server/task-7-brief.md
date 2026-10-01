## Task 7: Scope the SES policy and fix SPF

The relay credential is a long-lived key on an internet-facing box, and is
currently broader than the Lambda policy in the sibling `email` module.

**Files:**
- Modify: `infra/modules/mailserver/main.tf`
  (`data.aws_iam_policy_document.smtp` ~65, `aws_route53_record.spf` ~315)

**Interfaces:**
- Consumes: `aws_ses_domain_identity.main`.
- Produces: nothing new.

- [ ] **Step 1: Add a caller identity data source if absent**

```bash
cd /Users/mj/repos/mccor-labs/infra
grep -q 'data "aws_caller_identity" "current"' modules/mailserver/main.tf \
  || sed -i '' 's/^data "aws_region" "current" {}$/data "aws_region" "current" {}\ndata "aws_caller_identity" "current" {}/' modules/mailserver/main.tf
grep -n 'aws_caller_identity' modules/mailserver/main.tf
```

- [ ] **Step 2: Scope the SES policy to this domain's identity**

Replace the `statement` in `data.aws_iam_policy_document.smtp`:

```hcl
  statement {
    # Scoped to this one identity, matching modules/email. This key is
    # long-lived and lives on an internet-facing box, so it gets the
    # smallest blast radius available.
    actions   = ["ses:SendRawEmail"]
    resources = [aws_ses_domain_identity.main.arn]
  }
```

- [ ] **Step 3: Remove the Elastic IP from SPF**

```hcl
  # SES is the only sender. The instance's own IP is deliberately absent:
  # AWS blocks outbound 25 so it never sends, and authorising it here
  # would pre-approve spoofing if that block were ever lifted.
  records = ["v=spf1 include:amazonses.com -all"]
```

- [ ] **Step 4: Validate and confirm in the plan**

```bash
cd /Users/mj/repos/mccor-labs/infra
terraform fmt -recursive && terraform -chdir=setup validate -no-color
cd setup && AWS_PROFILE=default terraform plan -no-color -input=false \
  -var-file=../settings.auto.tfvars -var enable_mailserver=true \
  | grep -E 'v=spf1|identity/mccorlabs'
```

Expected: the SPF string with no `ip4:`, and an SES identity ARN rather
than `"*"`.

- [ ] **Step 5: Commit**

```bash
cd /Users/mj/repos/mccor-labs
git add infra/modules/mailserver/main.tf
git commit -m "fix(mailserver): scope SES send policy to the domain identity, drop EIP from SPF"
```

---

