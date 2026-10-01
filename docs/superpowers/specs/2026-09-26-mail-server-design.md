# Self-hosted mail server on AWS — design

Date: 2026-09-26 (revised after cross-examination)
Status: revised, awaiting review
Domain: mccorlabs.com · Account: 150701180133 · Region: us-east-1

## Purpose

Give a 2-5 person business real mailboxes on its own domain, on
infrastructure it owns, without a per-seat SaaS bill. Each person signs
into their own inbox, sends and receives, and the cost does not rise when
someone is hired.

Success: four people using `@mccorlabs.com` daily from phone and laptop,
mail reaching Gmail and Outlook inboxes rather than spam, one technical
owner able to understand and change the whole system, and a flat bill
around $21/month.

Rejected by the owner: Google Workspace, Microsoft 365, Zoho, and Amazon
WorkMail (closed to new customers 2026-04-30, support ends 2027-03-31).
Self-hosting is a requirement, not a preference.

## Constraints

1. **Everything is Terraform.** `apply` builds it, `destroy` removes it,
   nothing is created by hand. No console clicks.
2. **KISS.** Every resource must justify itself for five mailboxes.
3. **Cheap and genuinely flat** — not rising with headcount or volume.
4. **Scalable by editing a variable**, not by redesigning.
5. **Matches the existing repo's idiom.**

## What v1 is, and is not

**v1 is mail only.** Mailboxes reachable by any IMAP/SMTP client.

**Webmail is v2**, deliberately. Roundcube would add a second and third
container, a weekly security-patch commitment, reverse-proxy hardening,
fail2ban `X-Forwarded-For` wiring, PHP-FPM tuning, and would consume the
memory margin on a 2GB instance. None of that is worth carrying before the
mail itself is proven. The v2 shape is settled: Roundcube in its own
container on the same instance, SQLite in WAL mode on the mail volume,
behind Caddy, auto-updated weekly.

## Availability target

Single instance. Hours of downtime acceptable; mail loss is not.

Cheap because of how SMTP works: a sender that cannot reach us queues and
retries for three to five days. An outage delays mail, it does not destroy
it.

What must actually be protected is narrower: **mail already accepted.**
Once Postfix answers `250 OK` the sender discards its copy and our disk
holds the only one. That window — accepted but not yet snapshotted — is the
real exposure, and the snapshot interval bounds it.

## Architecture

```
        internet
           │
    ┌──────┴───────┐
    │   Route 53   │  MX, SPF, DKIM, DMARC, A
    └──────┬───────┘  + TCP:25 health check (free)
           │
  ┌────────┴─────────────────────────────────┐
  │  VPC 10.20.0.0/16, one public subnet     │
  │                                          │
  │   ┌────────────────────────────────┐     │
  │   │  EC2 t4g.small, Debian ARM     │     │
  │   │  IMDSv2 only, hop limit 1      │     │
  │   │  cpu_credits = standard        │     │
  │   │                                │     │
  │   │  ┌──────────────────────────┐  │     │
  │   │  │   docker-mailserver      │  │     │
  │   │  │ Postfix Dovecot Rspamd   │  │     │
  │   │  │ (pinned tag)             │  │     │
  │   │  └────────────┬─────────────┘  │     │
  │   └───────────────┼────────────────┘     │
  │                   │                      │
  │        ┌──────────┴──────────┐           │
  │        │ EBS gp3, encrypted  │           │
  │        │ maildir, config,    │           │
  │        │ certs               │           │
  │        └──────────┬──────────┘           │
  └───────────────────┼──────────────────────┘
                      │ DLM, every 6h, keep 7 days
                 ┌────┴─────┐
                 │ Snapshots│
                 └──────────┘

  outbound ──► SES SMTP relay :587 ──► internet
  inbound  ◄── :25 direct
```

### Why outbound goes through SES

AWS blocks outbound port 25 on every EC2 instance — removal is a
root-account form, up to 48 hours, and can be refused. Separately, a new IP
has no sending reputation.

Relaying through SES on 587 avoids both. SES is in the same account: the
last hop that hands mail to the internet, not a service holding mailboxes.
Inbound is unaffected — AWS does not block inbound 25.

### Component choices

| Choice            | Rejected                | Reason                                                                       |
| ----------------- | ----------------------- | ---------------------------------------------------------------------------- |
| docker-mailserver | Stalwart                | Pre-1.0, weekly releases, proprietary store not plain maildir                |
| docker-mailserver | mailcow                 | ~6GB RAM; state in MySQL behind a web UI                                     |
| docker-mailserver | Postfix+Dovecot by hand | DMS _is_ that, with ~200 decisions made and CI-tested                        |
| EBS gp3           | EFS                     | Dovecot on NFS is a documented way to corrupt indexes                        |
| DLM snapshots     | AWS Backup              | Vault + plan + selection + IAM role is a surface this repo uses nowhere else |
| DLM snapshots     | restic to S3            | Second tool, second credential, harder restore under pressure                |
| certbot           | Caddy                   | Caddy arrives with webmail in v2; v1 needs no HTTP server                    |

## Storage and state

One encrypted gp3 volume holds everything that must survive:

| Path                         | Contents                      |
| ---------------------------- | ----------------------------- |
| `/var/mail-data/mail-data`   | Maildir — the mail itself     |
| `/var/mail-data/mail-state`  | Dovecot indexes and UIDs      |
| `/var/mail-data/config`      | Accounts, aliases, DMS config |
| `/var/mail-data/letsencrypt` | Certificates and ACME account |

The root volume is disposable, rebuilt from user-data on every replacement,
and is not snapshotted. Swap lives on root deliberately: swap on the mail
volume would bloat every snapshot and put swap I/O in the backup path.

**Certificates must live on the persistent volume.** Let's Encrypt allows 5
certificates per identical name set per 7 days. With the ACME store on the
disposable root volume, six boot-script edits in a week locks issuance for
34+ hours. On the persistent volume a replaced instance reuses its existing
certificate and issues nothing. This is load-bearing, not incidental.

Sieve rules go to Dovecot via `ENABLE_MANAGESIEVE=1`, stored in the user's
home, so they ride the maildir snapshot for free.

### Mounting, and how it fails

The volume is found by the deterministic symlink Nitro exposes,
`/dev/disk/by-id/nvme-Amazon_Elastic_Block_Store_vol<id>`, templated in from
Terraform. Once formatted, fstab mounts by `LABEL=maildata`, so a volume
restored from a snapshot mounts despite a new ID.

**The volume's availability zone is pinned** to the same
`data.aws_availability_zones` entry the subnet uses. Not to break a
dependency cycle — there is none. The reason is that on instance
replacement the instance's AZ becomes "known after apply", which forces
replacement of the volume, and AZ is ForceNew. **That is data loss.** The
pin prevents it. Anyone tempted to remove this line should read this
paragraph first.

**The script fails closed.** If the symlink is absent after ~60 seconds, or
the mount does not land, it exits non-zero before starting the mail stack.
The failure this prevents is subtle and worse than a crash: a detection
loop that silently selects nothing lets `mkdir -p` succeed on the root
volume, the mail server start normally, and mail accumulate somewhere never
backed up until the next instance replacement destroys it.

## Adding and removing people

**Adding a mailbox must not replace the instance.** The mailbox list is
therefore _not_ templated into user-data — user-data changes force
replacement, which would mean a terminate-and-rebuild, a certificate
reissue and deferred mail every time someone is hired.

Instead, `terraform apply` writes an SSM SecureString parameter, and a
script on the box enumerates Parameter Store and creates anything missing.
The instance role already grants `ssm:GetParametersByPath` on
`/<domain>/mail/*`, so no new permissions are needed.

Adding someone:

1. Add them to `mailboxes` in `settings.auto.tfvars`, `apply`
2. `aws ssm start-session --target $(terraform output -raw mail_instance_id)`
3. `sudo /opt/mail/sync-accounts.sh`

A timer would be more machinery for something that happens twice a year and
benefits from a human watching it.

**Removal is manual on purpose.** The sync script only adds. Removing
someone from the map destroys their SSM parameter but leaves the mailbox
and its mail intact; deleting it is a separate, deliberate command.
Auto-deleting someone's mail because a map entry was edited is exactly the
failure `prevent_destroy` exists to prevent.

## Backup and restore

`aws_dlm_lifecycle_policy`, every 6 hours, retaining 28 snapshots — seven
days of recovery points, roughly $0.50-1.00/month. EBS snapshots bill unique
changed blocks across the retention window, so four a day costs close to
what nightly would.

DLM needs an execution role the console would have created silently. It is
created explicitly, using the AWS managed policy
`AWSDataLifecycleManagerServiceRole`, which already covers `kms:CreateGrant`
for the encrypted volume.

The schedule sets `copy_tags = true` and explicit `tags_to_add`. Without
tags, the teardown cleanup has nothing to match on.

`lifecycle { prevent_destroy = true }` protects the volume.
`disable_api_termination` is **not** used: since AWS provider v6.8.0 the
provider refuses to destroy an instance carrying that flag rather than
clearing it first, which would break both `terraform destroy` and any
user-data change.

### Recovering one deleted message

Restore the snapshot to a new volume, attach as a scratch device, mount at
a second mountpoint, copy the message into the live maildir's `new/`,
restart the container so Dovecot reindexes, then detach and **delete the
scratch volume** — the step people forget, billing $0.08/GB-month until
they remember.

### Recovering from total loss

Instance only: `terraform apply` rebuilds it and reattaches the existing
volume. No restore needed. RTO 10-15 minutes.

Volume gone too: create a volume from the latest snapshot, attach,
reconcile Terraform state, apply. RTO 20-30 minutes, RPO up to 6 hours.

### Accepted residual risk

Postfix's outbound queue is in the container's ephemeral layer. If SES were
degraded and mail sat queued when the instance died, that mail is lost and
no snapshot frequency prevents it. The window is normally seconds.

## Deliverability

| Record | Value                                                      |
| ------ | ---------------------------------------------------------- |
| MX     | `10 mail.mccorlabs.com`                                    |
| SPF    | `v=spf1 include:amazonses.com -all`                        |
| DKIM   | 3 SES CNAMEs, `d=mccorlabs.com`                            |
| DMARC  | `p=none` → quarantine → reject, `rua` to the admin mailbox |

SPF does **not** include the Elastic IP. Nothing sends from it, and listing
it would pre-authorise spoofing if port 25 were ever unblocked there.

SPF alignment will not pass DMARC, because SES uses an `amazonses.com`
bounce domain as MAIL FROM. DMARC needs SPF _or_ DKIM aligned, and DKIM is.

`postmaster@` and `abuse@` alias to a mailbox named explicitly in
`admin_mailbox`, validated to be one of the real mailboxes. Choosing the
first alphabetically would silently move these — and the DMARC reports —
whenever someone is hired.

Not implemented: MTA-STS and TLS-RPT (a second public HTTPS endpoint for a
threat model this business does not face), DANE (needs DNSSEC, whose
misconfiguration risk exceeds its benefit), BIMI (~$1,300/year for a logo),
DMARC `ruf` (poor support, PII burden), `autodiscover`/`autoconfig` records
(nothing serves the XML; they return with webmail in v2).

### SES sandbox — schedule this first

A new account starts in the SES sandbox: 200 messages per 24 hours,
1/second, **only to verified addresses**. Outbound to real contacts
silently fails until production access is granted.

There is no Terraform resource for this. It is scriptable, so it runs from
`deploy.sh setup` rather than the console:

```
aws sesv2 put-account-details --production-access-enabled \
  --mail-type TRANSACTIONAL --website-url https://mccorlabs.com \
  --additional-contact-email-addresses <alert_email> --contact-language EN
```

Approval takes roughly 24 hours. Fire it on the first setup run.

## Security

- SSM Session Manager only. No SSH port, no key. The agent is installed
  from AWS's Debian `.deb` — Debian cloud images ship no snapd, and a
  swallowed failure here means no way into the box at all.
- **IMDSv2 required, `http_put_response_hop_limit = 1`.** Without this any
  container can read instance credentials and through them every mailbox
  password in Parameter Store.
- `ses:SendRawEmail` scoped to the domain identity ARN, matching the
  pattern `modules/email` already uses — not `Resource: "*"`.
- Mailbox passwords generated by Terraform, stored in SSM SecureString,
  read at boot. Never in user-data, which any process can read via IMDS.
- Rspamd greylisting enabled.
- docker-mailserver pinned to an exact tag. v16.0.0 moved Dovecot 2.3 to
  2.4 with breaking changes; an unattended `pull` would take mail down.

### The one long-lived credential

SES SMTP authentication derives its password from an IAM access key. There
is no STS or instance-role equivalent, and bridging SMTP to the SES API
would add a service to build and maintain. Accepted, scoped tightly, and
documented in a comment as the single long-lived credential in the repo.
Rotation is manual and annual:
`terraform apply -replace=aws_iam_access_key.smtp`.

## Terraform state

`setup/` holds the mail server, and therefore holds every mailbox password
and the SES relay key. Its state must not be a plaintext file on one
laptop: losing it makes the mail server unmanageable — `prevent_destroy`
protects nothing if the state recording it is gone, and recovery means
hand-importing ~25 resources.

`setup/` gets an S3 backend in the bucket it creates, with
`key = "setup/terraform.tfstate"`, encryption and locking. The bootstrap
circularity is handled by the standard sequence: `init -backend=false`,
`apply` to create the bucket, then a one-time `init -migrate-state`.

Consequence for teardown: destroying the state bucket requires migrating
`setup/` back to local state first. This is in the runbook.

## Sizing

`t4g.small`, 2 vCPU, 2GB — comfortable in v1, since webmail is deferred.
2GB is docker-mailserver's own recommended figure for the full stack with
ClamAV disabled, which is what v1 runs.

**`credit_specification { cpu_credits = "standard" }` is required.** T-series
defaults to `unlimited`, which bills for sustained bursts — a spam flood
would make the "flat bill" claim false.

A 2GB swapfile on root, which DMS lists in its recommended configuration.

`mem_available_percent < 15%` alarms on the real risk, which is Rspamd:
memory-mapped maps that grow, and an open leak report against DMS.
**Decision rule: if it fires more than twice in thirty days, change
`instance_type` to `t4g.medium` and apply.** Do not pre-buy the headroom.

`data.aws_ami` uses `most_recent = true`, so a new Debian release would
silently replace the instance on an unrelated apply.
`lifecycle { ignore_changes = [ami] }` prevents that; OS upgrades are a
deliberate `-replace`.

## Monitoring

Every alarm below is free, and the set fits the CloudWatch free tier with
room spare: 7 alarm metrics of 10, 2 custom metrics of 10.

| Failure                     | Caught by                                     |
| --------------------------- | --------------------------------------------- |
| Instance up, Postfix dead   | Route 53 TCP:25 health check on the EIP       |
| Disk filling                | `disk_used_percent` on `/var/mail-data` > 80% |
| Snapshots silently stopping | `SnapshotsCreateCompleted` sum < 1 over 24h   |
| Cert renewal failing        | Daily cron, `openssl x509 -checkend`          |
| Mail queue backing up       | Daily cron, `mailq` count > 50                |
| SES bounce rate rising      | `Reputation.BounceRate > 0.05`                |
| Memory pressure             | `mem_available_percent < 15%`                 |
| Host wedged                 | `StatusCheckFailed`                           |
| CPU burst charges           | `CPUCreditBalance < 30`                       |

Three details that separate working monitoring from decorative monitoring:

**The DLM alarm uses `treat_missing_data = "breaching"`.** An errored DLM
policy publishes no metrics at all, so alarming on "failures > 0" never
fires in the case that matters. Alarm on the absence of successes.

**The Route 53 check is the only one testing the outcome from outside the
box.** Everything else asks the server how it feels. This asks whether mail
can be delivered, and catches security-group damage and crash-looping
containers as a side effect. Free: up to 50 health checks against AWS
endpoints in the same account.

**Two independent delivery paths.** CloudWatch alarms go through an SNS
topic with an email subscription; AWS Budgets emails directly. A
misconfigured SNS topic therefore does not leave the owner blind.

`alert_email` must be on a different provider. An alert about this mail
server, delivered to this mail server, is an alert nobody sees.

Not worth it: SES Virtual Deliverability Manager, a Synthetics canary
(~$12/mo), CloudWatch log shipping. The SES complaint-rate alarm is
marginal at ~800 messages/month and is the first to drop if a slot is
needed.

## Scaling path

| Growth             | Change                                          |
| ------------------ | ----------------------------------------------- |
| More people        | Add to `mailboxes`, apply, run the sync script  |
| More memory        | `instance_type`, apply                          |
| More storage       | `mail_volume_gb`, apply, `resize2fs` on the box |
| Tighter RPO        | DLM interval, apply                             |
| Higher send volume | Nothing — SES is metered, far below limits      |
| Webmail            | v2: Roundcube + Caddy, same instance            |

Known ceilings: SES sandbox at 200 messages/24h until production access;
volume growth needs one manual `resize2fs`; high availability is a
different system and not worth building at this size.

## Cost

| Item                              | Monthly     |
| --------------------------------- | ----------- |
| EC2 t4g.small                     | $12.26      |
| Public IPv4 (Elastic IP)          | $3.65       |
| EBS 40GB gp3                      | $3.20       |
| Snapshots, 6-hourly, 7 days       | ~$0.75      |
| Route 53 zone                     | $0.50       |
| SES                               | ~$0.02      |
| Monitoring (all within free tier) | $0.00       |
| **Total**                         | **~$20.38** |

Since February 2024 AWS charges for all public IPv4 addresses, attached or
not — an Elastic IP is not free.

Flat with headcount and with message volume. SES is $0.10 per thousand
messages; four people at 200/month each is eight cents.

Budget alarm at **$25** — enough margin above ~$20.38 for normal variation,
tight enough that an accidental NAT Gateway (~$33/month alone) trips it
within a day.

## Configuration

Everything a person edits lives in `settings.auto.tfvars`, which is **not**
committed — it holds the real domain, the owner's email and the team's
names. `settings.auto.tfvars.example` **is** committed, carrying safe
defaults, with `domain_name` and `alert_email` left blank. Both have
validations that refuse to run when empty, so a fresh clone fails with a
clear message rather than deploying a placeholder.

Names derive from the owned domain. One rule explains every resource in the
repository: keep the dots where the resource treats the string as free text
or a DNS/path literal (Name tags, Route 53 zone, SES identity, SSM paths);
replace dots with dashes where it is an opaque identifier (S3 buckets, IAM
users, Lambda functions, log groups). Per-environment application resources
use `project` instead, because they exist once per environment rather than
once per domain.

Secrets are never variables. Passwords are generated by Terraform and
stored in SSM; the only inputs are non-secret facts about the business.

## Teardown

`terraform destroy` removes everything except two deliberate survivors:

- **The mail volume** has `prevent_destroy`, which aborts the entire
  destroy rather than excepting itself. Removing it on purpose means
  `terraform state rm` on the attachment and the volume, then
  `aws ec2 delete-volume`.
- **Snapshots** outlive the volume by design — they are the backup. They
  carry tags so the cleanup command can find them.

Also surviving, all free and none a leak: custom CloudWatch metrics (no
longer published), and SES production access and its suppression list.

The runbook gives the exact commands, including migrating `setup/` state
back to local before destroying the state bucket.

## Out of scope

Webmail (v2), calendars and contacts, shared or group mailboxes, mailing
lists, archiving and retention policy, and any compliance regime.
