## Task 5: Certificates on the persistent volume

Let's Encrypt allows 5 certificates per name set per 7 days. With the ACME
store on the disposable root volume, six boot-script edits in a week locks
issuance for 34+ hours.

**Files:**
- Modify: `infra/modules/mailserver/templates/setup.sh.tftpl` (certbot
  section and the compose volume list)

**Interfaces:**
- Consumes: `/var/mail-data` mounted by Task 3.
- Produces: certificates under `/var/mail-data/letsencrypt`.

- [ ] **Step 1: Point certbot at the persistent volume**

Replace the certbot block with:

```bash
# ---------- TLS certificate ----------
# The ACME store lives on the MAIL volume, not the root volume. Let's
# Encrypt allows 5 certificates per name set per week; with the store on
# the disposable root disk, a handful of instance replacements locks
# issuance for over a day. On the mail volume a rebuilt instance finds
# its existing certificate and issues nothing.
apt-get install -y certbot
ln -sfn /var/mail-data/letsencrypt /etc/letsencrypt

if [ ! -d "/etc/letsencrypt/live/$FQDN" ]; then
  for i in $(seq 1 20); do
    certbot certonly --standalone --non-interactive --agree-tos \
      -m "$ALERT_EMAIL" -d "$FQDN" && break
    echo "certbot failed (DNS may not have propagated); retrying in 60s"
    sleep 60
  done
fi

if [ ! -d "/etc/letsencrypt/live/$FQDN" ]; then
  echo "FATAL: no certificate for $FQDN" >&2
  exit 1
fi
```

- [ ] **Step 2: Add a renewal hook that reloads the mail server**

Certbot renews at ~60 days but Postfix and Dovecot hold the old file
handles until restarted:

```bash
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-mail.sh <<'HOOK'
#!/bin/sh
docker restart mailserver 2>/dev/null || true
HOOK
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-mail.sh
```

- [ ] **Step 3: Check rendered shell syntax**

```bash
cd /Users/mj/repos/mccor-labs/infra
sed -e 's/\${[a-z_]*}/x/g' modules/mailserver/templates/setup.sh.tftpl > "$TMPDIR/r.sh"
bash -n "$TMPDIR/r.sh" && echo "SHELL SYNTAX OK"
```

Expected: `SHELL SYNTAX OK`.

- [ ] **Step 4: Confirm the symlink precedes certbot**

```bash
cd /Users/mj/repos/mccor-labs/infra
grep -n 'ln -sfn /var/mail-data/letsencrypt\|certbot certonly\|mountpoint -q /var/mail-data' \
  modules/mailserver/templates/setup.sh.tftpl
```

Expected line order: the `mountpoint` check, then the `ln -sfn`, then
`certbot certonly`. Certbot must never run before the volume is mounted.

- [ ] **Step 5: Commit**

```bash
cd /Users/mj/repos/mccor-labs
git add infra/modules/mailserver/templates/setup.sh.tftpl
git commit -m "fix(mailserver): keep ACME store on the persistent volume"
```

---

