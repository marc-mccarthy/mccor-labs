# Website on AWS

Serverless, all Terraform, near-$0 to run. One configuration deploys:

- **the main site** at `example.com` and `www.example.com` (when `ENV_ID` is empty), and
- **personal copies** like `mm.example.com` for testing (when `ENV_ID=mm`).

```
Browser ──> Route 53 ──> CloudFront ──> S3   (website files)
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
app/
  web/                   <- the real site (Next.js static export)
```

## Cost

| Piece              | Cost                                  |
| ------------------ | ------------------------------------- |
| Domain             | whatever Namecheap charges you yearly |
| Route 53 DNS zone  | $0.50/month                           |
| HTTPS certificates | $0                                    |
| S3 + CloudFront    | pennies at low traffic                |
| Budget alerts      | $0                                    |

Personal copies add essentially nothing. The Route 53 zone alone is the only
_fixed_ cost above.

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

Teammates use their own initials for a personal copy: `ENV_ID=jd ./infra/deploy.sh`.

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

The main site has deletion protection on its S3 bucket, so its destroy first
turns protection off, then deletes. **This permanently deletes the live site
and every file in it.**

To remove the shared setup too (only after every copy and the main site are gone):

```bash
cd infra/setup
terraform apply   -var-file=../settings.auto.tfvars -var="force_destroy=true"
terraform destroy -var-file=../settings.auto.tfvars -var="force_destroy=true"
```

## Your real frontend

The site in `app/web` is already the real frontend: a Next.js static export,
built and uploaded by `./infra/deploy.sh publish` (see "Building and
deploying" below). Logins, the database and the API are parked (commented
out) in `infra/main.tf` and `infra/outputs.tf` -- that code has no backend to
run against yet. The comment above the parked block in `infra/main.tf` gives
the re-enable steps.

## The website

The marketing site lives in `app/web`. It is a Next.js app that builds to plain
static files, deployed to the same S3 bucket and CloudFront distribution as
everything else here.

Requirements: Node 24 (see `.node-version`), pnpm 12, and the 1Password CLI (`op`), signed in.

Install pnpm from Homebrew (`brew install pnpm`), which is where 12.6.0 comes from
on this machine, and make sure `/opt/homebrew/bin` is on your `PATH` before any
other pnpm: a plain `pnpm` here resolves to a self-installing shim that tries to
fetch `pnpm@12.6.0` from npm, where that version does not exist, so every command
and every git hook dies silently rather than reporting an error.

### Running it locally

```bash
pnpm install
pnpm dev                      # via `op run`; needs the 1Password CLI, signed in
```

`pnpm install` installs lefthook and asks to run its build script -- lefthook is
what writes the git hooks, and pnpm blocks dependency build scripts by default.
Approving it is necessary but on its own it was not sufficient: the hook files
only appeared once a `lefthook.yml` with active jobs existed in the repo root.
That file is committed, so a fresh clone gets the hooks. If they are missing,
run `pnpm approve-builds lefthook` and then `pnpm exec lefthook install`. Always
confirm, because a missing hook means every check silently passes:

```bash
test -f .git/hooks/pre-commit && echo "hooks installed"
```

- The 1Password CLI must be installed and signed in for `pnpm dev` and `pnpm build` -- both go through `op run`.
- Values live in 1Password, in the `Development` vault under the `mccor-labs` item (with a hyphen). The references are in `app/web/.env.template`, which is committed because it holds `op://` paths, not values.
- A locked 1Password means the pre-push hook's `build` step fails with an `op` error, not a code error -- check that first before debugging the build.
- `pnpm build:raw` skips `op run` entirely. It is the escape hatch for building against an unconfigured or locked vault; the environment-dependent values come out empty.

The site runs at http://localhost:3000.

### Editing content

All copy lives in `app/web/src/content/`. Services, team members, process stages
and navigation are typed, so a missing field is a build error rather than a blank
space on the page. No copy lives in components.

### How the site is built

- Lenis drives scroll. It is not constructed under `prefers-reduced-motion`, and
  pinned sections fall back to normal flow.
- The three.js scenes (hero, systems, pipeline) load lazily through
  `SceneRuntime` after the page has loaded, and fall back to static posters when
  WebGL2 is missing or motion is reduced. Under reduced motion three.js is never
  fetched.
- Diagrams and code blocks are built from typed content, not sourced as images.
- Accessibility is gated: axe (WCAG 2.2 AA) and keyboard-trap tests must pass.
  Performance is reported, apart from CLS, INP, font and LCP-image size, which
  are hard gates in `app/web/tests/e2e/budgets.spec.ts`.

### Checks

`git commit` formats and lints the files in that commit, taking a couple of
seconds. `git push` runs the full gate: type-check, lint, format check, unit
tests, a production build and smoke tests. To run most of it by hand:

```bash
pnpm verify
```

`pnpm verify` is type-check, lint, format check, unit tests and the build. The
end-to-end tests are separate:

```bash
pnpm -F web test:e2e           # full suite
pnpm -F web test:e2e:smoke     # the @smoke subset, which is what pre-push runs
```

Those run **Firefox headless**, and only Firefox -- it is the one engine the
Playwright config declares. On a fresh machine, install it first:

```bash
pnpm exec playwright install firefox
```

Browsers go into the shared `~/Library/Caches/ms-playwright/` cache, not into the
repo, so other projects on the machine share them. Adding a second engine to
`app/web/playwright.config.ts` means installing that engine's browser revision
too.

To bypass the hooks -- for a work-in-progress commit on a branch, never on main:

```bash
LEFTHOOK=0 git commit -m "wip"
```

### Building and deploying

```bash
pnpm build
```

That writes `app/web/out/` for local checks. To go live:

```bash
./infra/deploy.sh publish            # the main site
ENV_ID=mm ./infra/deploy.sh publish  # your copy, mm.example.com
```

This needs that environment's infrastructure already deployed (plain
`./infra/deploy.sh`, or with `ENV_ID` set, first). `publish` then:

- Refuses to build if anything under `app/`, `package.json`,
  `pnpm-lock.yaml`, `pnpm-workspace.yaml` or `.node-version` is uncommitted
  or untracked, or if a gitignored Next.js env file (`.env`, `.env.local`,
  etc.) exists under `app/web` -- publish only ever builds committed code.
- Builds with `op run`, setting `NEXT_PUBLIC_SITE_URL` to that environment's
  own `site_url` from Terraform, so the sitemap, `robots.txt` and
  `metadataBase` always name the right host.
- Snapshots the build output before uploading anything, so a concurrent
  `pnpm build` elsewhere (lefthook's pre-push hook, `pnpm verify`) can't mirror
  a half-written tree onto the live site.
- Uploads `_next/static/` with a one-year cache, then everything else with a
  cache that browsers always revalidate and CloudFront keeps for a day.
- Invalidates `/*` (one of CloudFront's 1,000 free paths a month) and waits
  for it to finish.
- Only once that invalidation completes, deletes files the new build no
  longer has -- so nothing drops a file a cached old page might still need.

The CloudFront function (`infra/modules/static_site/viewer_request.js.tftpl`)
serves `/services/` and `/services` from `services/index.html`, since a plain
S3 origin doesn't resolve directory indexes; returns a real 404 with the
site's own 404 page for anything missing; and 301-redirects `www` to the
apex.

## What Terraform doesn't do

- Create your AWS account, or run `aws login` for you
- Change the name servers at Namecheap (step 4, once)
