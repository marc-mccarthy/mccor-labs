# Website + logins + database on AWS

Serverless, all Terraform, near-$0 to run. One configuration deploys:

- **the main site** at `example.com` and `www.example.com` (when `ENV_ID` is empty), and
- **personal copies** like `mm.example.com` for testing (when `ENV_ID=mm`).

```
Browser ──> Route 53 ──> CloudFront ──> S3                  (website files)
   │
   ├──────> Cognito hosted sign-in page                     (logins)
   │
   └──────> API Gateway HTTP API ──> Lambda ──> DynamoDB    (your data)
             (checks the login token first)
```

## Where this goes

Put all of it in your website's git repo, even before the site exists. The
`app/web` placeholder page stands in until your real frontend is ready. Commit
`infra/backend.hcl` and the `.terraform.lock.hcl` files; neither is secret.
`infra/settings.auto.tfvars` is the opposite -- it holds your real domain,
your alert email and your team's names, so it's gitignored and never
committed. Commit `infra/settings.auto.tfvars.example` instead, as the
template, and keep it in sync when you add a variable. The `.gitignore`
already keeps state files and build zips out too.

## Layout

```
infra/
  settings.auto.tfvars           <- your project name, domain, alert email. Gitignored -- not committed.
  settings.auto.tfvars.example   <- the committed template; copy it to settings.auto.tfvars
  deploy.sh                      <- the one command you run
  backend.hcl                    <- written by setup; commit it
  main.tf, variables.tf, outputs.tf, versions.tf
  setup/                         <- one-time: state bucket, DNS zone, budget alert
  modules/                       <- certificate, static_site, auth, database, api, email, mailserver
  MAIL.md                        <- running your own mail server (optional, ~$20/month) -- see below
app/
  api/index.mjs          <- example API (per-user items)
  web/                   <- placeholder page with sign-in; replace with your real site
```

## Cost

| Piece                | Cost                                                                  |
| -------------------- | --------------------------------------------------------------------- |
| Domain               | whatever Namecheap charges you yearly                                 |
| Route 53 DNS zone    | $0.50/month                                                           |
| HTTPS certificates   | $0                                                                    |
| Cognito Lite         | $0 up to 10,000 monthly active users (shared by all copies)           |
| Lambda               | $0 within 1M requests/month (always free)                             |
| DynamoDB             | $0 within 25 GB + 25 read/write units (main uses 5 each, each copy 1) |
| API Gateway HTTP API | $1.00 per million requests                                            |
| S3 + CloudFront      | pennies at low traffic                                                |
| Budget alerts        | $0                                                                    |

Personal copies add essentially nothing. The Route 53 zone alone is the only
_fixed_ cost above -- but if you also turn on the optional mail server
(`enable_mailserver` in `settings.auto.tfvars`), that adds a flat ~$20.38/month
regardless of headcount. See [`infra/MAIL.md`](infra/MAIL.md) for what that
buys, its full cost breakdown, and how to run and scale it.

## One-time setup

**You need:** Terraform 1.16+, AWS CLI 2.32+ (for `aws login`), bash (macOS/Linux,
or WSL / Git Bash on Windows), and an AWS account on the **Paid** plan (the Free
plan closes the account after six months).

### 1. Log in

```bash
aws login
```

Terraform can't read `aws login` sessions on its own everywhere yet, so add this
bridge profile to `~/.aws/config` (AWS's documented workaround). If you ran
`aws login --profile something`, put that name instead of `default`.

```ini
[profile terraform]
credential_process = aws configure export-credentials --profile default --format process
region = us-east-1
```

`deploy.sh` uses the `terraform` profile automatically. Check it works:

```bash
aws sts get-caller-identity --profile terraform
```

When your login expires, just run `aws login` again.

### 2. Fill in your settings

Edit `infra/settings.auto.tfvars`: project name, domain, alert email.

### 3. Run setup

```bash
./infra/deploy.sh setup
```

It creates the state bucket, the Route 53 zone and the budget alert, writes
`infra/backend.hcl`, and prints four name servers.

### 4. Point Namecheap at Route 53

Namecheap → **Domain List** → **Manage** next to your domain → **Nameservers** →
choose **Custom DNS** → enter the four name servers from step 3 → click the
green checkmark. That's the only thing to change at Namecheap; every other DNS
record now lives in Route 53.

Wait until the change is live (often minutes, up to 48 hours):

```bash
dig +short NS example.com
```

When it lists the `awsdns` name servers, continue. (Windows: `nslookup -type=ns example.com`.)

### 5. Commit

```bash
git add -A
git commit -m "Infrastructure setup"
```

Also back up `infra/setup/terraform.tfstate` somewhere safe. It's git-ignored and
it's how Terraform knows it owns the bucket and zone.

## Deploying

```bash
ENV_ID=mm ./infra/deploy.sh      # your copy at https://mm.example.com
./infra/deploy.sh                # the main site at https://example.com
./infra/deploy.sh plan           # preview only (works with ENV_ID too)
```

Terraform shows the plan and asks for `yes` before changing anything. The first
deploy of each copy takes a while (certificate + CloudFront).

Each copy has its own users, database and API, so sign up separately in each.
Teammates use their own initials: `ENV_ID=jd ./infra/deploy.sh`.

`ENV_ID` rules: 1-8 lowercase letters or numbers, starting with a letter. It
can't be `www` or `default`, or contain `aws`, `amazon` or `cognito`. The script
checks this before doing anything.

After the first deploy, commit the new `infra/.terraform.lock.hcl` and
`infra/setup/.terraform.lock.hcl` files.

## Deleting

```bash
ENV_ID=mm ./infra/deploy.sh destroy   # removes your copy completely
./infra/deploy.sh destroy             # removes the main site (asks twice)
```

The main site has deletion protection on its users, data and files, so its
destroy first turns protection off, then deletes. **This permanently deletes every
user account and all data.**

To remove the shared setup too (only after every copy and the main site are gone):

```bash
cd infra/setup
terraform apply   -var-file=../settings.auto.tfvars -var="force_destroy=true"
terraform destroy -var-file=../settings.auto.tfvars -var="force_destroy=true"
```

## Things to know

- **Email cap.** Cognito's built-in email sender is free but only for a small
  number of messages per day. Before real users arrive, set up Amazon SES and
  point the user pool's `email_configuration` at it.
- **Sessions.** The placeholder page doesn't refresh tokens, so users sign in
  again after 60 minutes.
- **Rate limits.** The API allows 10 requests/second (bursts of 20). Adjust
  `throttle_rate` and `throttle_burst` in the api module.
- **Adding routes.** Add a route key to `routes` in the api module (for example
  `"PUT /items/{id}"`) and handle it in `app/api/index.mjs`.
- **Team email.** Don't add MX/SPF/DKIM records to `infra/setup/main.tf`
  yourself -- `setup/main.tf` explicitly leaves mail DNS to whichever mail
  option you turn on, so hand-adding records there creates a duplicate MX.
  Turn on `enable_email` (forwarding into an inbox you already own) or
  `enable_mailserver` (your own mail server) in `settings.auto.tfvars`
  instead and run `./infra/deploy.sh setup`; see
  [`infra/MAIL.md`](infra/MAIL.md) for the mail server option. Not at
  Namecheap: once the name servers point to Route 53, Namecheap's DNS
  records are ignored.

## Your real frontend

Once you have a build step (React, Vue, etc.), delete the `aws_s3_object.web`
resource in `infra/main.tf` and upload your build instead. Keep `config.js`,
which Terraform still writes. Run these from `infra/` right after a deploy
(Terraform remembers which environment you deployed last). Replace
`../dist` with wherever your build output lands:

```bash
aws s3 sync ../dist "s3://$(terraform output -raw site_bucket)" --delete --exclude config.js --profile terraform
aws cloudfront create-invalidation --distribution-id "$(terraform output -raw cloudfront_distribution_id)" --paths "/*" --profile terraform
```

## What Terraform doesn't do

- Create your AWS account, or run `aws login` for you
- Change the name servers at Namecheap (step 4, once)
