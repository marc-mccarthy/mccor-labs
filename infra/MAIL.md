# Mail on mccorlabs.com

Your own mail server, on your own EC2 instance, holding your own mailboxes.
No Google Workspace, no Microsoft, no per-seat fee. Adding a fifth person
costs nothing extra.

## What exists

| Piece                          | What it does                                              |
| ------------------------------ | --------------------------------------------------------- |
| EC2 `t4g.small`, Debian 12 ARM | Runs the mail stack                                       |
| Separate encrypted EBS volume  | Holds the mail, so rebuilding the server never touches it |
| `docker-mailserver`            | Postfix + Dovecot + Rspamd spam filtering + fail2ban      |
| Elastic IP                     | Fixed address, so DNS stays valid across reboots. Billed. |
| Route53                        | A, MX, SPF, DMARC, 3 DKIM CNAMEs                          |
| SES                            | Outbound relay only. Does not store your mail.            |
| SSM Parameter Store            | Holds the mailbox passwords, encrypted                    |

Ports open to the internet: **25** (other servers delivering to you), **80**
(Let's Encrypt renewal only), **587** (your people sending, STARTTLS), **993**
(your people reading, SSL/TLS). Port 465 is not open — 587 is the one
documented submission port, and two ports for one job is surface without
benefit.

### Why sending goes through SES

Two problems with sending straight from an EC2 box, both real:

1. **AWS blocks outbound port 25 on every instance.** Getting it unblocked
   means a form submitted as the root user and roughly 48 hours, and AWS can
   say no.
2. **A brand-new IP has no reputation.** Gmail and Outlook treat mail from
   unknown addresses as suspicious, and it lands in spam or is rejected.

Relaying through SES on port 587 sidesteps both. SES is in your own AWS
account — it is the last hop that hands mail to the internet, not a service
holding your mailboxes.

Receiving is entirely yours: the internet delivers straight to your instance
on port 25, which AWS does _not_ block inbound.

## There is no webmail

v1 is IMAP/SMTP clients only. No browser inbox, no Roundcube. That is
deferred to a later phase. Every mailbox is read with a mail app — see
"Client settings" below.

The `autodiscover`/`autoconfig` DNS records some mail setups rely on do not
exist here; nothing serves the XML they'd need. Every client is configured
by hand, every time.

## Turning it on

Three steps, in order. **Step 2 is manual and cannot be skipped** — the TLS
certificate for the mail server is issued by Let's Encrypt reading DNS, and
DNS cannot be authoritative for this zone until the registrar points at it.

### 1. Base infrastructure

```bash
./infra/deploy.sh setup
```

Creates the state bucket, the Route53 zone, and the budget alarm. The very
first time this runs, the state bucket doesn't exist yet, so it applies
locally, then migrates its own state into the bucket it just created;
`deploy.sh` handles this automatically — every run after that is a plain
`terraform init`. See "State migration cleanup" below for what this leaves
behind on disk.

Once `enable_mailserver` is true (step 3), this command also requests SES
production access if it hasn't already been requested or granted. Approval
takes about 24 hours — see "The SES sandbox" below, this is the single most
likely "why is mail broken" problem in week one.

### 2. Point Namecheap at Route53 (you must do this)

Namecheap keeps owning the domain. You are only changing which nameservers
answer DNS for it.

1. Sign in to Namecheap, Domain List, Manage next to `mccorlabs.com`
2. Find **Nameservers**, change the dropdown from Namecheap BasicDNS to
   **Custom DNS**
3. Enter the four nameservers printed at the end of step 1's output, one per
   row
4. Save, then wait. Usually minutes, occasionally a few hours.

Check it took effect:

```bash
dig +short NS mccorlabs.com
```

When that lists the four `awsdns` names, you are ready for step 3. Skipping
this step and flipping `enable_mailserver` anyway means certbot cannot prove
you own the domain, and the boot script fails with `FATAL: no certificate
for mail.mccorlabs.com`.

### 3. Build the mail server

In `settings.auto.tfvars`, change:

```
enable_mailserver = true
```

Then:

```bash
./infra/deploy.sh setup
```

Takes about 10 minutes: the instance boots, installs Docker, requests a
Let's Encrypt certificate, starts the mail stack, and creates the mailboxes
listed in `mailboxes`.

## Getting the passwords

```bash
cd infra/setup && terraform output -json mailbox_passwords
```

One per person. Have each person change theirs after first sign-in:

```bash
aws ssm start-session --target $(terraform output -raw mail_instance_id)
sudo docker exec -it mailserver setup email update marcm@mccorlabs.com
```

## Client settings

There is no webmail and no autodiscover. Enter these by hand in the mail
app:

| Setting         | Value                                        |
| --------------- | -------------------------------------------- |
| Username        | full address, e.g. `marcm@mccorlabs.com`     |
| Password        | from `terraform output` above                |
| Incoming (IMAP) | `mail.mccorlabs.com`, port **993**, SSL/TLS  |
| Outgoing (SMTP) | `mail.mccorlabs.com`, port **587**, STARTTLS |

On iPhone: Settings, Apps, Mail, Mail Accounts, Add Account, Other.

## Adding a person

1. Edit `mailboxes` in `settings.auto.tfvars`:

   ```
   mailboxes = {
     marcm    = "Marc M"
     nateb    = "Nate B"
     kirstenh = "Kirsten H"
     ashleyt  = "Ashley T"
     newhire  = "New Hire"
   }
   ```

2. `./infra/deploy.sh setup` — this writes a new SSM SecureString parameter
   with a generated password. It does **not** rebuild the instance: the
   mailbox list is deliberately not baked into user-data, because user-data
   changes force a replacement, and replacing the instance on every hire
   would mean a certificate reissue and deferred mail each time.

3. SSM onto the box and run the sync script:

   ```bash
   aws ssm start-session --target $(terraform output -raw mail_instance_id)
   sudo /opt/mail/sync-accounts.sh
   ```

   The script reads every parameter under `/mccorlabs.com/mail/`, skips
   names that already have a mailbox, and creates the rest. It never
   deletes — see "Removing a person" for why that's separate.

4. Get the password, hand it over out-of-band, confirm send and receive
   before doing anything else with the new address (like inviting them to
   any other service at their new `@mccorlabs.com` address).

## Removing a person

Removing someone from `mailboxes` and re-applying destroys their SSM
parameter — but **does not delete their mailbox or their mail**. That's
deliberate: `prevent_destroy` on the mail volume exists precisely so an
edited map can't cascade into deleted mail.

Delete the mailbox itself only when you mean it:

```bash
aws ssm start-session --target $(terraform output -raw mail_instance_id)
sudo docker exec -it mailserver setup email del someone@mccorlabs.com
```

## Restoring one deleted message

The mail volume snapshots every 6 hours, keeping 7 days.

1. Find the snapshot to restore from:

   ```bash
   aws ec2 describe-snapshots --owner-ids self \
     --filters Name=tag:Backup,Values=mccorlabs-com-mail \
     --query 'Snapshots[].[SnapshotId,StartTime]' --output table
   ```

2. Create a new volume from it, in the same AZ as the mail instance:

   ```bash
   aws ec2 create-volume --availability-zone <az> \
     --snapshot-id <snapshot-id> --volume-type gp3
   ```

3. Attach it to the running mail instance as a scratch device:

   ```bash
   aws ec2 attach-volume --volume-id <new-vol-id> \
     --instance-id $(terraform output -raw mail_instance_id) \
     --device /dev/sdg
   ```

4. On the box, mount it at a second mountpoint (read the message out, don't
   write anything back to it):

   ```bash
   sudo mkdir -p /mnt/restore
   sudo mount /dev/xvdg /mnt/restore   # device name AWS assigns may differ
   ```

5. Copy the message into the live maildir's `new/` directory for the
   right mailbox, then restart the container so Dovecot reindexes it:

   ```bash
   sudo cp /mnt/restore/mail-data/<mailbox>/new/<message-file> \
     /var/mail-data/mail-data/<mailbox>/new/
   sudo docker restart mailserver
   ```

6. Detach and **delete the scratch volume**. This is the step people forget
   — it bills at gp3 rates until someone remembers:

   ```bash
   sudo umount /mnt/restore
   aws ec2 detach-volume --volume-id <new-vol-id>
   aws ec2 delete-volume --volume-id <new-vol-id>
   ```

## Restoring from total loss

**Instance gone, volume intact.** Nothing to restore. `terraform apply`
rebuilds the instance and reattaches the existing volume by its resource
reference. RTO 10-15 minutes.

**Volume gone too.** The volume itself carries `prevent_destroy`, so this
only happens from something outside Terraform's control (manual deletion,
account-level disaster).

1. Find the latest snapshot (same `describe-snapshots` command as above).
2. Create a volume from it in the mail instance's AZ.
3. Reconcile Terraform state so it knows about the new volume in place of
   the old one — this needs `terraform import` or a state edit under
   `module.mailserver[0].aws_ebs_volume.mail`, matched to the real volume ID.
4. `terraform apply` to reattach.

RTO 20-30 minutes, RPO up to 6 hours (the snapshot interval).

## The SES sandbox

**This is the single most likely "why is mail broken" question in week
one.** A new AWS account's SES starts in the sandbox: 200 messages per 24
hours, 1 per second, and outbound reaches **only verified addresses**.

Receiving is not affected. Inbound mail never touches SES — it arrives
straight from the internet on port 25. So on day one:

- Someone emails `marcm@mccorlabs.com` from Gmail → arrives fine
- Marc replies → SES refuses to send it

Mail flows in but not out, which is why this looks half-broken rather than
obviously blocked.

What a refusal looks like: Postfix takes the message, SES rejects the
hand-off, and Postfix holds it in the queue and keeps retrying. Enough of
those and the mail-queue alarm fires at 50 messages. So the symptom you
actually get is an alert about a queue backing up, and the cause is this.

`./infra/deploy.sh setup` requests production access automatically once
`enable_mailserver = true`, the first time it runs. Approval takes roughly
24 hours.

Your alarms are unaffected either way — they go through SNS, not SES.
Monitoring works from the first minute.

### Testing before production access is granted

Verify one address you control, and you can prove the whole round trip —
DKIM, DMARC, delivery — without waiting:

```bash
aws ses verify-email-identity --email-address you@gmail.com
```

AWS emails that address a confirmation link. Click it, then send from
`marcm@mccorlabs.com` to it and reply back. In Gmail, open the message,
"Show original", and look for:

```
dkim=pass header.d=mccorlabs.com
dmarc=pass
```

Verification is per-address, so this is only useful for testing — do not
try to verify every address your team will ever email.

Check the account's status:

```bash
aws sesv2 get-account
```

`ProductionAccessEnabled: true` means you're clear, and the verified-address
restriction no longer applies.

## The nine alarms

All nine publish to one SNS topic (`alerts_topic_arn` in the outputs), with
an email subscription to `alert_email`. **That subscription must be
confirmed** — AWS emails a confirmation link the first time the topic is
created, and nothing alerts until someone clicks it. Check:

```bash
aws sns list-subscriptions-by-topic \
  --topic-arn $(terraform output -raw alerts_topic_arn)
```

`SubscriptionArn` showing `PendingConfirmation` means no alert has ever
reached anyone.

| Alarm                                | Watches                                       | Mail arriving means                                                                              |
| ------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `*-smtp-unreachable`                 | Route53 TCP:25 health check on the Elastic IP | Nobody can deliver mail to you — dead Postfix, broken security group, or crash-looping container |
| `*-mail-host-check`                  | EC2 `StatusCheckFailed`                       | The host or OS is wedged                                                                         |
| `*-mail-disk-full`                   | `disk_used_percent` on `/var/mail-data` > 80% | The mail volume is filling; resize it or it starts rejecting or dropping mail                    |
| `*-mail-memory`                      | `mem_available_percent` < 15%                 | Usually Rspamd growing. If this fires twice in 30 days, move to `t4g.medium`                     |
| `*-mail-snapshots-stopped`           | `SnapshotsCreateCompleted` sum < 1 over 24h   | Backups have silently stopped — the DLM policy errored                                           |
| `*-ses-bounce-rate`                  | SES `Reputation.BounceRate` > 5%              | Sustained, AWS suspends your sending ability                                                     |
| `*-mail-cpu-credits`                 | `CPUCreditBalance` < 30                       | Sustained load is about to throttle the instance                                                 |
| (daily cron, not a CloudWatch alarm) | Certificate expiring within 21 days           | Renewal is failing silently — Let's Encrypt stopped sending expiry emails in June 2025           |
| (daily cron, not a CloudWatch alarm) | Mail queue > 50 messages                      | Usually a broken SES relay credential                                                            |

## Deliverability testing

Send a test message to https://www.mail-tester.com and aim for 9/10 or
better.

Then send from `@mccorlabs.com` to a personal Gmail address, open it, click
"Show original", and confirm:

```
dkim=pass header.d=mccorlabs.com
```

If DKIM doesn't pass, check the three DKIM CNAMEs are live:
`dig +short CNAME <token>._domainkey.mccorlabs.com` for each of the three
tokens in `aws ses get-identity-dkim-attributes --identities mccorlabs.com`.

DMARC starts at `p=none`, which reports without rejecting. After a week of
clean sending, tighten it to `p=quarantine`, then `p=reject`, by editing the
DMARC record in `modules/mailserver/main.tf`.

## Checking it works

Shell onto the box:

```bash
cd infra/setup
aws ssm start-session --target $(terraform output -raw mail_instance_id)
```

Useful checks:

```bash
tail -f /var/log/mail-setup.log         # first-boot progress
sudo docker logs -f mailserver          # the mail server itself
sudo docker exec mailserver setup email list
sudo ss -lntp | grep -E '25|587|993'    # listening
```

From your laptop:

```bash
dig +short MX mccorlabs.com             # should be 10 mail.mccorlabs.com
dig +short TXT mccorlabs.com            # SPF
openssl s_client -connect mail.mccorlabs.com:993 -brief
```

## Cost

| Item                             | Monthly     |
| -------------------------------- | ----------- |
| EC2 `t4g.small`                  | $12.26      |
| Public IPv4 (Elastic IP)         | $3.65       |
| EBS 40GB gp3 (20 mail + 20 root) | $3.20       |
| Snapshots, 6-hourly, 7 days      | ~$0.75      |
| Route53 hosted zone              | $0.50       |
| SES                              | ~$0.02      |
| Monitoring (all free tier)       | $0.00       |
| **Total**                        | **~$20.38** |

Flat regardless of headcount. AWS has charged for every public IPv4 address,
attached or not, since February 2024 — the Elastic IP is not free.

The budget alarm in `setup/` fires at **$25**: enough margin above $20.38
for normal variation, tight enough that an accidental extra resource (a NAT
Gateway is ~$33/month alone) trips it within a day.

To reduce cost, `t4g.micro` at roughly half the EC2 price works for four
mailboxes, though Rspamd is happier with the extra memory. Change
`instance_type` in `settings.auto.tfvars` and re-run `./deploy.sh setup`;
Terraform resizes the running instance in place, no data loss.

## Scaling the mail disk

`mail_volume_gb` in `settings.auto.tfvars` sizes the separate EBS volume
that holds mail (20GB by default). Raising it and re-running
`./deploy.sh setup` grows the volume, but Terraform only grows the block
device -- it does not resize the filesystem sitting on it. After the apply
finishes, SSM into the box and grow the filesystem to match:

```bash
aws ssm start-session --target <instance-id>
sudo resize2fs /dev/<mail-device>
```

Until that runs, `df` on the box still reports the old, smaller size even
though AWS is billing for the new one.

## State migration cleanup

The first `./infra/deploy.sh setup` run moves `setup/`'s own Terraform state
into S3, and leaves timestamped local copies behind as a safety net:

- `terraform.tfstate.pre-migrate.<timestamp>` — the state as it was right
  before migration started
- `terraform.tfstate.migrated-<timestamp>` — the local state file, moved out
  of Terraform's search path right after migration succeeded

Both live in `infra/setup/` and are already gitignored, so they can't leak
into git — but they still hold every mailbox password and the SES relay
credential in plaintext, on your laptop. Once a later `./infra/deploy.sh
setup` run has proven the remote state is good (it read and wrote to S3
without complaint), delete both files by hand. That's the step that finally
gets the mailbox passwords off the laptop.

## Tearing it down

Two resources carry `prevent_destroy`, and either one aborts the WHOLE
destroy rather than just excepting itself:

- **the mail volume** -- it holds everyone's mail
- **the Route 53 zone** -- recreating it assigns brand-new name servers, which
  means going back into the registrar by hand and waiting for propagation with
  mail and the website down throughout. The records inside are cheap to
  rebuild; the delegation is not.

Read that second one twice before removing it. Everything else in this repo
can be rebuilt by `terraform apply`. The registrar step cannot.

To remove everything on purpose, in this order. The `terraform destroy` below
also destroys `aws_s3_bucket.state` -- the bucket holding the very state
`destroy` is reading from -- so the state must already be back on your local
disk before you run it, not after:

```bash
# 1. Migrate setup's own state back to local, and leave it local. Skipping
#    this, or restoring backend.tf before step 3, means `destroy` tears down
#    the S3 bucket its own state lives in while it is still reading from
#    that bucket.
cd infra/setup
mv backend.tf backend.tf.disabled
terraform init -migrate-state

# 2. Drop the two prevent_destroy resources from state so `destroy` can run
#    at all -- Terraform refuses to even plan a destroy that touches them.
terraform state rm 'module.mailserver[0].aws_volume_attachment.mail'
terraform state rm 'module.mailserver[0].aws_ebs_volume.mail'
terraform state rm 'aws_route53_zone.main'

# 3. Destroy everything else, including the state bucket, while still on
#    local state. force_destroy is required here -- without it the bucket
#    destroy fails with BucketNotEmpty (versioned state objects still inside
#    it) and aborts the whole destroy.
terraform destroy -var-file=../settings.auto.tfvars -var="force_destroy=true"

# backend.tf.disabled has nothing left to migrate back to -- the bucket it
# pointed at no longer exists. Leave it disabled, or delete it.

# 4. The zone survives step 2/3 because it was removed from state, not
#    destroyed. Delete it only if you are giving up the domain or moving DNS
#    elsewhere -- and expect to redo the registrar step if you ever come back:
#    aws route53 delete-hosted-zone --id <zone-id>

# 5. The volume and its snapshots survive the same way. Remove them last:
aws ec2 delete-volume --volume-id <vol-id>
aws ec2 describe-snapshots --owner-ids self \
  --filters Name=tag:Backup,Values=mccorlabs-com-mail \
  --query 'Snapshots[].SnapshotId' --output text \
  | tr '\t' '\n' | xargs -rn1 aws ec2 delete-snapshot --snapshot-id
```

Nothing else survives. Custom CloudWatch metrics stop being published and
cost nothing; SES production access and its suppression list persist and
are free.

Verify no flag blocks destroy:

```bash
cd /Users/mj/repos/mccor-labs/infra
grep -rn 'disable_api_termination' modules/ || echo "OK: nothing blocks destroy"
```

Expected: `OK: nothing blocks destroy`.
