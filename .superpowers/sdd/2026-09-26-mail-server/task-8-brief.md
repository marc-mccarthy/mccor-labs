## Task 8: Backups — DLM every 6 hours

There is currently no backup of any kind.

**Files:**
- Modify: `infra/modules/mailserver/main.tf` (append)
- Modify: `infra/modules/mailserver/outputs.tf` (append)

**Interfaces:**
- Consumes: `aws_ebs_volume.mail`, `var.domain_name`.
- Produces: `aws_dlm_lifecycle_policy.mail`, output `snapshot_tag`.

- [ ] **Step 1: Protect the volume from accidental destruction**

Add to `aws_ebs_volume.mail`:

```hcl
  lifecycle {
    # Flipping enable_mailserver to false must not be able to delete
    # everyone's mail. Removing this volume on purpose means
    # `terraform state rm` first -- see the teardown runbook.
    prevent_destroy = true
  }
```

- [ ] **Step 2: Add the DLM role and policy**

```hcl
# ---------- Backups ----------

# DLM needs a service role. The console creates this silently; in
# Terraform it is explicit. The AWS managed policy already covers
# kms:CreateGrant for the encrypted volume.
resource "aws_iam_role" "dlm" {
  name_prefix = "${replace(var.domain_name, ".", "-")}-dlm-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "dlm.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "dlm" {
  role       = aws_iam_role.dlm.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole"
}

# Every 6 hours rather than nightly. Mail a sender has already been told
# we accepted is mail the sender has discarded -- between snapshots this
# disk is the only copy in existence. Snapshots are block-incremental, so
# four a day costs little more than one.
resource "aws_dlm_lifecycle_policy" "mail" {
  description        = "${var.domain_name} mail volume"
  execution_role_arn = aws_iam_role.dlm.arn
  state              = "ENABLED"

  policy_details {
    resource_types = ["VOLUME"]

    target_tags = {
      Backup = local.snapshot_tag
    }

    schedule {
      name = "6-hourly"

      create_rule {
        interval      = 6
        interval_unit = "HOURS"
        times         = ["00:00"]
      }

      retain_rule {
        count = 28 # 7 days
      }

      # Tags are what the teardown cleanup matches on. Without them the
      # snapshots are unfindable and bill forever.
      tags_to_add = {
        Name   = "${var.domain_name}-mail-data"
        Backup = local.snapshot_tag
      }

      copy_tags = true
    }
  }
}
```

- [ ] **Step 3: Add the local and tag the volume**

In `locals`, add:

```hcl
  snapshot_tag = "${replace(var.domain_name, ".", "-")}-mail"
```

And in `aws_ebs_volume.mail`'s `tags`:

```hcl
  tags = {
    Name   = "${var.domain_name}-mail-data"
    Backup = local.snapshot_tag
  }
```

- [ ] **Step 4: Add the output**

In `outputs.tf`:

```hcl
output "snapshot_tag" {
  description = "Tag the backup snapshots carry, for finding them during a restore"
  value       = local.snapshot_tag
}
```

- [ ] **Step 5: Validate and confirm the plan**

```bash
cd /Users/mj/repos/mccor-labs/infra
terraform fmt -recursive && terraform -chdir=setup validate -no-color
cd setup && AWS_PROFILE=default terraform plan -no-color -input=false \
  -var-file=../settings.auto.tfvars -var enable_mailserver=true \
  | grep -E 'aws_dlm_lifecycle_policy|aws_iam_role.dlm'
```

Expected: both resources will be created.

- [ ] **Step 6: Commit**

```bash
cd /Users/mj/repos/mccor-labs
git add infra/modules/mailserver/main.tf infra/modules/mailserver/outputs.tf
git commit -m "feat(mailserver): 6-hourly DLM snapshots and prevent_destroy on the mail volume"
```

---

