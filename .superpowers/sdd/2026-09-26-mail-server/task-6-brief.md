## Task 6: Pin the stack and finish the container configuration

The image tag, the swapfile, greylisting and ManageSieve are spec
requirements with no home yet. Grouped: one edit to the boot script plus
two record removals, covered by one check.

**Files:**
- Modify: `infra/modules/mailserver/templates/setup.sh.tftpl`
- Modify: `infra/modules/mailserver/main.tf` (remove autodiscover,
  autoconfig, and the 465 ingress rule)

**Interfaces:**
- Consumes: `/var/mail-data` from Task 3.
- Produces: nothing new.

- [ ] **Step 1: Pin the docker-mailserver image**

In the compose heredoc, replace
`image: ghcr.io/docker-mailserver/docker-mailserver:latest` with:

```yaml
    # Pinned deliberately. v16.0.0 moved Debian 12->13 and Dovecot
    # 2.3->2.4 with documented breaking changes; an unattended
    # `docker compose pull` would take mail down on an ordinary Tuesday.
    # Upgrades are a deliberate edit, after reading the release notes.
    image: ghcr.io/docker-mailserver/docker-mailserver:16.0.1
```

- [ ] **Step 2: Add greylisting and ManageSieve**

In the same heredoc's `environment:` list:

```yaml
      # Greylisting rejects a first delivery attempt with a temporary
      # error. Real mail servers retry; most opportunistic spam bots do
      # not. Free, and the most effective single spam control here.
      - ENABLE_RSPAMD_GREYLISTING=1
      # Sieve rules live in Dovecot, in each user's home on the mail
      # volume, so they survive a restore without a separate backup.
      - ENABLE_MANAGESIEVE=1
```

- [ ] **Step 3: Add the swapfile**

Insert after the mail disk section:

```bash
# ---------- swap ----------
# On the ROOT volume, deliberately: swap on the mail volume would be
# captured by every snapshot and put swap I/O in the backup path. DMS
# lists swap in its recommended setup; it turns a memory spike from an
# OOM kill into a slow moment.
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi
swapon -a || true
```

- [ ] **Step 4: Remove what serves nothing**

In `main.tf`, delete `aws_route53_record.autodiscover` and
`aws_route53_record.autoconfig` entirely — nothing serves the XML those
protocols fetch, so they are decoration making a false promise. They
return in v2 with Roundcube.

In `aws_vpc_security_group_ingress_rule.mail`, delete the `smtps` entry
(port 465). 587 is the documented submission port; two ports for one job
is surface without benefit.

- [ ] **Step 5: Verify**

```bash
cd /Users/mj/repos/mccor-labs/infra
grep -q 'docker-mailserver:latest' modules/mailserver/templates/setup.sh.tftpl \
  && echo "STILL UNPINNED - fix" || echo "TAG PINNED"
grep -q 'autodiscover\|autoconfig' modules/mailserver/main.tf \
  && echo "RECORDS STILL PRESENT - fix" || echo "RECORDS GONE"
grep -q 'smtps' modules/mailserver/main.tf \
  && echo "465 STILL OPEN - fix" || echo "465 CLOSED"
sed -e 's/\${[a-z_]*}/x/g' modules/mailserver/templates/setup.sh.tftpl > "$TMPDIR/r.sh"
bash -n "$TMPDIR/r.sh" && echo "SHELL SYNTAX OK"
terraform fmt -recursive && terraform -chdir=setup validate -no-color
```

Expected: `TAG PINNED`, `RECORDS GONE`, `465 CLOSED`, `SHELL SYNTAX OK`,
`Success! The configuration is valid.`

- [ ] **Step 6: Commit**

```bash
cd /Users/mj/repos/mccor-labs
git add infra/modules/mailserver/main.tf infra/modules/mailserver/templates/setup.sh.tftpl
git commit -m "feat(mailserver): pin image, enable greylisting and sieve, add swap, drop dead records"
```

---

