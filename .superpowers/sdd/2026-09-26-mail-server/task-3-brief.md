## Task 3: Deterministic disk mounting that fails closed

The current loop can silently select nothing, letting mail accumulate on
the un-snapshotted root volume until the next instance replacement
destroys it.

**Files:**
- Modify: `infra/modules/mailserver/main.tf` (`aws_ebs_volume.mail` ~241,
  `aws_instance.mail` templatefile args ~270)
- Modify: `infra/modules/mailserver/templates/setup.sh.tftpl` (lines ~38-56)

**Interfaces:**
- Consumes: `aws_ebs_volume.mail.id`.
- Produces: a template variable `mail_device` holding the Nitro by-id path.

- [ ] **Step 1: Pin the volume's availability zone**

In `aws_ebs_volume.mail`, replace
`availability_zone = aws_instance.mail.availability_zone` with:

```hcl
  # Pinned to the same AZ as the subnet, NOT read off the instance. On
  # instance replacement the instance's AZ becomes "known after apply",
  # which forces replacement of this volume -- and availability_zone is
  # ForceNew, so that is data loss. Do not "simplify" this line.
  availability_zone = data.aws_availability_zones.available.names[0]
```

- [ ] **Step 2: Pass the by-id path into the template**

In `aws_instance.mail`'s `templatefile` map, add:

```hcl
    mail_device = "/dev/disk/by-id/nvme-Amazon_Elastic_Block_Store_${replace(aws_ebs_volume.mail.id, "-", "")}"
```

- [ ] **Step 3: Replace the detection loop**

In `setup.sh.tftpl`, replace the whole `for i in $(seq 1 30)` block and the
`if [ -n "$DEV" ]` block with:

```bash
# ---------- mail disk ----------
# Nitro exposes a stable symlink per volume, so the disk is identified
# exactly rather than guessed at by size. The old guess could select
# nothing, letting mkdir succeed on the root volume and mail accumulate
# somewhere that is never backed up.
DEV="${mail_device}"
for i in $(seq 1 12); do
  [ -e "$DEV" ] && break
  sleep 5
done

if [ ! -e "$DEV" ]; then
  echo "FATAL: mail volume $DEV never appeared" >&2
  exit 1
fi

# Only format a genuinely empty disk. A restored snapshot already has a
# filesystem and must not be touched.
blkid "$DEV" >/dev/null 2>&1 || mkfs.ext4 -L maildata "$DEV"

mkdir -p /var/mail-data
# Mount by LABEL, not by ID: a volume restored from a snapshot gets a new
# volume ID but keeps its label.
grep -q maildata /etc/fstab || echo "LABEL=maildata /var/mail-data ext4 defaults,nofail 0 2" >> /etc/fstab
mount -a

if ! mountpoint -q /var/mail-data; then
  echo "FATAL: /var/mail-data did not mount" >&2
  exit 1
fi

mkdir -p /var/mail-data/{mail-data,mail-state,mail-logs,config,letsencrypt}
```

- [ ] **Step 4: Check shell syntax**

The template is not valid shell until rendered, so check the rendered
form:

```bash
cd /Users/mj/repos/mccor-labs/infra
sed -e 's/\${mail_device}/\/dev\/null/g' -e 's/\${[a-z_]*}/x/g' \
  modules/mailserver/templates/setup.sh.tftpl > "$TMPDIR/rendered.sh"
bash -n "$TMPDIR/rendered.sh" && echo "SHELL SYNTAX OK"
```

Expected: `SHELL SYNTAX OK`.

- [ ] **Step 5: Validate and plan**

```bash
cd /Users/mj/repos/mccor-labs/infra
terraform fmt -recursive && terraform -chdir=setup validate -no-color
cd setup && AWS_PROFILE=default terraform plan -no-color -input=false \
  -var-file=../settings.auto.tfvars -var enable_mailserver=true | grep -E "^Plan:"
```

Expected: valid, and a `Plan:` line with no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/mj/repos/mccor-labs
git add infra/modules/mailserver/main.tf infra/modules/mailserver/templates/setup.sh.tftpl
git commit -m "fix(mailserver): mount mail volume by stable device id, fail closed"
```

---

