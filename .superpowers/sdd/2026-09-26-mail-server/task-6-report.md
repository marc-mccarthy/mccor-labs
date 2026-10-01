# Task 6 Report: Pin the stack and finish the container configuration

## Status: DONE

## Commit
`b36677c` — "feat(mailserver): pin image, enable greylisting and sieve, add swap, drop dead records"

## Image tag
Pinned to `ghcr.io/docker-mailserver/docker-mailserver:16.0.1` as specified in the brief.

Verified against the registry before committing: queried the ghcr.io token endpoint and fetched
the manifest for both `16.0.1` and `latest` (via `Authorization: Bearer <token>` against
`https://ghcr.io/v2/docker-mailserver/docker-mailserver/manifests/<tag>`). Both returned HTTP 200
with the **same digest** (`sha256:d0fe7668defe157aad57ea31b1707ad1e2fb57d7a91bdf17cbdf876549946c86`),
confirming `16.0.1` exists and is in fact the current `latest` release — no substitution needed.

## Other changes
- Added `ENABLE_RSPAMD_GREYLISTING=1` and `ENABLE_MANAGESIEVE=1` to the compose `environment:` list.
- Added the swap section (2G swapfile, root volume, `swapon -a || true`) after the mail-disk mount
  block, before the TLS/certbot section — not on `/var/mail-data`.
- Removed `aws_route53_record.autodiscover` and `aws_route53_record.autoconfig` entirely from
  `main.tf`.
- Removed the `smtps` (465) entry from `aws_vpc_security_group_ingress_rule.mail`'s for_each map;
  25/80/587/993 untouched. Updated the adjacent comment block to reflect 465 being intentionally
  closed (was stale otherwise).

## Notes / care taken
- The brief's suggested comment used backticks around `` `docker compose pull` `` — the compose
  heredoc in setup.sh.tftpl is unquoted (`<<COMPOSE`), so backticks would be interpreted as shell
  command substitution at boot time. Dropped the backticks in the actual comment to avoid that trap.
- Did not touch Task 3/4/5 interfaces (mail device mount, sync-accounts.sh heredoc, ACME store
  paths/systemd drop-in).

## Verification
All Step 5 checks passed: `TAG PINNED`, `RECORDS GONE`, `465 CLOSED`, `SHELL SYNTAX OK`,
`terraform fmt -recursive` clean, `terraform -chdir=setup validate -no-color` →
"Success! The configuration is valid." `git status` confirmed only the two intended files changed.

## Concerns
None. No `terraform apply` was run.
