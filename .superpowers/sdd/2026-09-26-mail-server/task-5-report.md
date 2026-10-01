# Task 5 report: Certificates on the persistent volume

**Status:** Done
**Commit:** d88ca4bc4ac932d71b00fbc0366f60e647d1dd1a

**Verification:** `bash -n` on the rendered template passes ("SHELL SYNTAX OK");
`terraform validate` succeeds; `grep -n '/etc/letsencrypt'
modules/mailserver/templates/setup.sh.tftpl` shows only the container-internal
mount target and two comment lines describing the rejected symlink approach —
no remaining bare host-side `/etc/letsencrypt` path. `terraform fmt -recursive
-check -diff` is clean.

**What changed (per Controller Ruling R3, not the brief's `ln -sfn`):**
Introduced `CERTBOT_DIR="/var/mail-data/letsencrypt"` and passed
`--config-dir/--work-dir/--logs-dir` explicitly to `certbot certonly`. The
existence check, the fail-closed check after issuance, and the
renewal-hooks deploy directory all use `$CERTBOT_DIR` instead of
`/etc/letsencrypt`. The compose file's host-side mount changed to
`/var/mail-data/letsencrypt:/etc/letsencrypt:ro` (container-internal path
unchanged, since `SSL_TYPE=letsencrypt` expects it there).

**Renewal:** Debian's certbot package installs `certbot.timer` ->
`certbot.service` running `certbot renew` against default paths, which
would never see this certificate. Added a systemd drop-in
(`/etc/systemd/system/certbot.service.d/override.conf`) that clears and
replaces `ExecStart` with `certbot renew` using the same three directory
flags, then `systemctl daemon-reload`. The packaged timer itself is left
enabled/untouched — only the service's command changes.

**Concerns:**
- Did not verify certbot.service's exact default `ExecStart` line on the
  target Debian AMI; the override clears whatever it is (`ExecStart=`
  followed by a fresh `ExecStart=`), which is the standard systemd
  drop-in pattern and doesn't depend on knowing the original value.
- Did not add a monitoring/alert path for renewal failures beyond what
  already exists — out of scope for this task's brief.
