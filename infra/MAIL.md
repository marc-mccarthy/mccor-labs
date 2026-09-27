# Mail on mccorlabs.com

Your own mail server, on your own EC2 instance, holding your own mailboxes.
No Google Workspace, no Microsoft, no per-seat fee. Adding a fifth person
costs nothing extra.

## What exists

| Piece | What it does |
|---|---|
| EC2 `t4g.small`, Debian 12 ARM | Runs the mail stack |
| Separate encrypted EBS volume | Holds the mail, so rebuilding the server never touches it |
| `docker-mailserver` | Postfix + Dovecot + Rspamd spam filtering + fail2ban |
| Elastic IP | Fixed address, so DNS stays valid across reboots |
| Route53 | A, MX, SPF, DMARC, 3 DKIM CNAMEs, autodiscover, autoconfig |
| SES | Outbound relay only. Does not store your mail. |
| SSM Parameter Store | Holds the mailbox passwords, encrypted |

### Why sending goes through SES

Two problems with sending straight from an EC2 box, both real:

1. **AWS blocks outbound port 25 on every instance.** Getting it unblocked
   means a form submitted as the root user and roughly 48 hours, and AWS can
   say no.
2. **A brand-new IP has no reputation.** Gmail and Outlook treat mail from
   unknown addresses as suspicious, and it lands in spam or is rejected.

Relaying through SES on port 587 sidesteps both. SES is in your own AWS
account -- it is the last hop that hands mail to the internet, not a service
holding your mailboxes.

Receiving is entirely yours: the internet delivers straight to your instance
on port 25, which AWS does *not* block inbound.

## Turning it on

Three steps, in order. Step 2 is manual and cannot be skipped.

### 1. Base infrastructure (done)

    ./infra/deploy.sh setup

Created the state bucket, the Route53 zone, and the budget alarm.

### 2. Point Namecheap at Route53 (you must do this)

Namecheap keeps owning the domain. You are only changing which nameservers
answer DNS for it.

1. Sign in to Namecheap, Domain List, Manage next to `mccorlabs.com`
2. Find **Nameservers**, change the dropdown from Namecheap BasicDNS to
   **Custom DNS**
3. Enter these four, one per row:

       ns-1154.awsdns-16.org
       ns-1701.awsdns-20.co.uk
       ns-356.awsdns-44.com
       ns-746.awsdns-29.net

4. Save, then wait. Usually minutes, occasionally a few hours.

Check it took effect:

    dig +short NS mccorlabs.com

When that lists the four `awsdns` names, you are ready for step 3.

### 3. Build the mail server

In `settings.auto.tfvars`, change:

    enable_mailserver = true

Then:

    ./infra/deploy.sh setup

Takes about 10 minutes: the instance boots, installs Docker, requests a
Let's Encrypt certificate, starts the mail stack, and creates the four
mailboxes.

## Getting the passwords

    cd infra/setup && terraform output -json mailbox_passwords

One per person. Have each person change theirs after first sign-in:

    aws ssm start-session --target $(terraform output -raw mail_instance_id)
    docker exec -it mailserver setup email update marcm@mccorlabs.com

## How people read their mail

There is no webmail in this setup. People use a mail app.

| Setting | Value |
|---|---|
| Username | full address, e.g. `marcm@mccorlabs.com` |
| Password | from `terraform output` above |
| Incoming (IMAP) | `mail.mccorlabs.com`, port **993**, SSL/TLS |
| Outgoing (SMTP) | `mail.mccorlabs.com`, port **587**, STARTTLS |

Enter these by hand. The `autodiscover` and `autoconfig` DNS records exist
but nothing serves the XML they point at yet, so clients cannot configure
themselves from just an address.

On iPhone: Settings, Apps, Mail, Mail Accounts, Add Account, Other.

If you do want webmail later, Roundcube runs on the same box behind the
existing certificate.

## Adding or removing people

Edit `mailboxes` in `settings.auto.tfvars`:

    mailboxes = {
      marcm    = "Marc M"
      nateb    = "Nate B"
      kirstenh = "Kirsten H"
      ashleyt  = "Ashley T"
    }

Then `./infra/deploy.sh setup`. Terraform generates a password and creates
the mailbox on the next boot cycle.

Removing someone from the map removes their password from Parameter Store but
**does not delete the mailbox** on disk. Delete it deliberately:

    docker exec -it mailserver setup email del someone@mccorlabs.com

## Onboarding someone, end to end

Order matters -- the 1Password invitation goes to the new address, so the
mailbox has to work first.

1. Add them to `mailboxes`, run `./infra/deploy.sh setup`
2. Get their password: `terraform output -json mailbox_passwords`
3. Send them, over something other than email: their address, their password,
   and the IMAP/SMTP settings above
4. Have them add the account to their mail app and confirm they can send and
   receive. Send a test both ways before going further.
5. Only now invite them to 1Password, at their new `@mccorlabs.com` address:
   1Password, People, Invite People. They receive the invitation in the
   mailbox from step 4.
6. They accept, set a 1Password account password, and save their Secret Key
7. Have them move the mailbox password into 1Password and change it from the
   generated one

Do not invite anyone to 1Password before step 4 passes. If mail is not
flowing, the invitation is unrecoverable and has to be resent.

## Checking it works

Shell onto the box:

    cd infra/setup
    aws ssm start-session --target $(terraform output -raw mail_instance_id)

Useful checks:

    tail -f /var/log/mail-setup.log        # first-boot progress
    docker logs -f mailserver              # the mail server itself
    docker exec mailserver setup email list
    ss -lntp | grep -E '25|587|993'        # listening

From your laptop:

    dig +short MX mccorlabs.com            # should be 10 mail.mccorlabs.com
    dig +short TXT mccorlabs.com           # SPF
    openssl s_client -connect mail.mccorlabs.com:993 -brief

Best end-to-end test: send from a personal Gmail to `marcm@mccorlabs.com`,
then reply from the mail client and confirm it arrives without landing in
spam.

## Deliverability

Getting mail *accepted* by Gmail and Outlook is the hard part of running your
own server. What is already handled:

- **SPF** names SES and the server's own IP as allowed senders
- **DKIM** signing is done by SES on the way out, with the three CNAMEs in place
- **DMARC** starts at `p=none`, which reports without rejecting

After a week of clean sending, tighten DMARC to `p=quarantine`, then
`p=reject`, in `modules/mailserver/main.tf`.

Test your score at https://www.mail-tester.com -- send it a message and aim
for 9/10 or better.

Reverse DNS is *not* configured. It matters less when relaying through SES,
since the connecting IP is SES's. If you later stop relaying and send direct,
request both the port 25 unblock and a PTR record for the Elastic IP through
the AWS "Request to Remove Email Sending Limitations" form.

## Cost

| Item | Monthly |
|---|---|
| EC2 `t4g.small` | ~$12 |
| EBS, 20 GB mail + 20 GB root | ~$3.20 |
| Route53 hosted zone | $0.50 |
| SES | ~$0.10 at low volume |
| Elastic IP (attached) | $0 |
| **Total** | **~$16/month, flat** |

Flat regardless of headcount. Four people on Google Workspace would be ~$28
and rising with each hire.

To halve it, `t4g.micro` at ~$6/month works for four mailboxes, though Rspamd
is happier with the extra memory. Change `instance_type` in
`settings.auto.tfvars`.

## Backups

The mail volume is **not** backed up yet. It is a separate encrypted EBS
volume, so terminating the instance does not destroy it, but a deleted volume
is gone for good. Worth adding AWS Backup or a nightly snapshot before this
holds anything that matters.
