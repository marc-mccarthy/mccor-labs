## Task 2: Harden the instance — IMDSv2, CPU credits, AMI drift

Three one-line changes, each closing a real hole. Grouped because they
touch the same resource and share one plan check.

**Files:**
- Modify: `infra/modules/mailserver/main.tf` (`aws_instance.mail`, ~line 256)

**Interfaces:**
- Consumes: nothing.
- Produces: an `aws_instance.mail` that cannot leak credentials to a
  container, cannot bill for CPU bursts, and cannot be silently replaced
  by a new Debian release.

- [ ] **Step 1: Add the three blocks to `aws_instance.mail`**

```hcl
  # Containers must not be able to reach instance credentials: one hop is
  # the host itself, so a container's request is dropped. Without this,
  # anything running here can read every mailbox password from SSM.
  metadata_options {
    http_tokens                 = "required"
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 1
  }

  # T-series defaults to "unlimited", which bills for sustained bursts.
  # A spam flood would quietly make this an expensive instance.
  credit_specification {
    cpu_credits = "standard"
  }

  lifecycle {
    # data.aws_ami.debian is most_recent, so a new Debian release would
    # otherwise replace this instance during an unrelated apply. OS
    # upgrades are deliberate: terraform apply -replace=...
    ignore_changes = [ami]
  }
```

- [ ] **Step 2: Format and validate**

```bash
cd /Users/mj/repos/mccor-labs/infra
terraform fmt -recursive && terraform -chdir=setup validate -no-color
```

Expected: `Success! The configuration is valid.`

- [ ] **Step 3: Confirm the attributes appear in the plan**

```bash
cd /Users/mj/repos/mccor-labs/infra/setup
AWS_PROFILE=default terraform plan -no-color -input=false \
  -var-file=../settings.auto.tfvars -var enable_mailserver=true \
  | grep -E 'http_tokens|hop_limit|cpu_credits'
```

Expected three lines: `http_tokens = "required"`,
`http_put_response_hop_limit = 1`, `cpu_credits = "standard"`.

- [ ] **Step 4: Commit**

```bash
cd /Users/mj/repos/mccor-labs
git add infra/modules/mailserver/main.tf
git commit -m "fix(mailserver): require IMDSv2, fix CPU credits to standard, ignore AMI drift"
```

---

