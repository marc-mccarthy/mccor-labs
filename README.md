# Website on AWS

Serverless, all Terraform, near-$0 to run. One configuration deploys:

- **the main site** at `example.com` and `www.example.com` (when `ENV_ID` is empty), and
- **personal copies** like `mm.example.com` for testing (when `ENV_ID=mm`).

```
Browser ──> Route 53 ──> CloudFront ──> S3   (website files)
```

## Where this goes

Put all of it in your website's git repo. Commit `infra/backend.hcl` and the
`.terraform.lock.hcl` files; neither is secret. The `.gitignore` already keeps
state files and build zips out too.

## Layout

```
infra/
  terraform.env                  <- settings as op:// references into 1Password
  deploy.sh                      <- the one command you run
  publish-guard.sh               <- vets the build output before publish uploads it
  backend.hcl                    <- written by setup; commit it
  main.tf, variables.tf, outputs.tf, versions.tf
  setup/                         <- one-time: state bucket, DNS zone, budget alert
  modules/                       <- certificate, static_site, publish_role, auth, database, api, email, mailserver
                                    (static_site and publish_role carry their own tests/)
  tests/                         <- publish-guard.sh tests
app/
  web/                   <- the real site (Next.js static export)
scripts/                 <- reference-capture and media-render helpers
docs/                    <- site copy drafts, future notes
lefthook.yml             <- git hooks (pre-commit, pre-push)
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

**You need:** Terraform 1.16+, AWS CLI 2.32+ (for `aws login`), the 1Password CLI
(`op`), signed in, bash (macOS/Linux, or WSL / Git Bash on Windows), and an AWS
account on the **Paid** plan (the Free plan closes the account after six months).

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

`deploy.sh` uses the `terraform` profile automatically (for `publish` on the main site it prefers a `publish` profile if you have one). Check it works:

```bash
aws sts get-caller-identity --profile terraform
```

When your login expires, just run `aws login` again.

### 2. Fill in your settings

Settings live in 1Password, in the Development vault item that `infra/terraform.env` points at. Fill in its fields there: `project`, `domain_name`, `alert_email`, `monthly_budget_usd`, `enable_mailserver` (`true`/`false`), `mailboxes` (a Terraform map, e.g. `{ marcm = "Marc M" }`), `admin_mailbox`, `instance_type`, `mail_volume_gb`. Don't edit `infra/terraform.env` itself. It's committed, and it only holds `op://` references. `deploy.sh` resolves them with `op run` and passes them to Terraform as environment variables, so nothing is written to disk. Install the 1Password CLI and run `op signin` first.

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

Setup's state lives in the versioned S3 bucket it created (see `infra/setup/backend.tf`), not on your machine. The first run leaves a local copy at `infra/setup/terraform.tfstate.migrated-<date>`. It's git-ignored but holds your settings in plain text, so move it somewhere safe or delete it once `terraform state list` works in `infra/setup`.

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
op run --env-file=../terraform.env -- terraform apply   -var="force_destroy=true"
op run --env-file=../terraform.env -- terraform destroy -var="force_destroy=true"
```

## Your real frontend

The site in `app/web` is already the real frontend: a Next.js static export,
built and uploaded by `./infra/deploy.sh publish` (see "Building and
deploying" below). Logins, the database and the API are parked (commented
out) in `infra/main.tf` and `infra/outputs.tf` -- that code has no backend to
run against yet (`module "api"` points at `app/api`, which doesn't exist).

## The website

The marketing site lives in `app/web`. It is a Next.js app that builds to plain
static files, deployed to the same S3 bucket and CloudFront distribution as
everything else here.

Requirements: Node 24 (see `.node-version`), pnpm 12 (pinned by `packageManager`
in `package.json`), and the 1Password CLI (`op`), signed in.

Node and pnpm come from mise, so no `PATH` changes are needed. The repo has no
`mise.toml`; mise picks Node up from `.node-version` and pnpm from the global
`~/.config/mise/config.toml`. The git hooks put `~/.local/share/mise/shims` on
`PATH` themselves.

### Running it locally

```bash
pnpm install
pnpm dev                      # via `op run`; needs the 1Password CLI, signed in
```

`pnpm install` installs lefthook, which writes the git hooks from the committed
`lefthook.yml`; `pnpm-workspace.yaml` already lists lefthook under `allowBuilds`,
so pnpm doesn't block its build script. If the hooks are missing, run
`pnpm exec lefthook install`. Always confirm, because a missing hook means every
check silently passes:

```bash
test -f .git/hooks/pre-commit && echo "hooks installed"
```

- The 1Password CLI must be installed and signed in for `pnpm dev` and `pnpm build` -- both go through `op run`.
- Values live in 1Password, in the `Development` vault under the `mccor-labs` item (with a hyphen). The references are in `app/web/.env`, which is committed because it holds `op://` paths, not values.
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
  or untracked, or if a gitignored env file (such as `app/web/.env.local`)
  exists under `app/web` -- publish only ever builds committed code, with its
  env coming only from the committed `app/web/.env`.
- Builds with `op run`, setting `NEXT_PUBLIC_SITE_URL` to that environment's
  own `site_url` from Terraform, so the sitemap, `robots.txt` and
  `metadataBase` always name the right host.
- Vets the snapshot with `infra/publish-guard.sh` before uploading, and refuses
  on a symlink, a dotfile, a file type outside the allowed list (html, txt, js,
  css, json, xml, woff2, webp, avif, jpg, svg, mp4, webm, glsl), a file named
  like one in `rejected-media/`, or any git-ignored file under `app/web/public`.
  It also refuses if `index.html` or `404.html` is missing, or if `robots.txt`
  doesn't name this environment's sitemap.
- Snapshots the build output before uploading anything, so a concurrent
  `pnpm build` elsewhere (lefthook's pre-push hook, `pnpm verify`) can't mirror
  a half-written tree onto the live site.
- Uploads `_next/static/` with a one-year immutable cache, `media/` and `fonts/`
  with a one-day cache (plus a week of stale-while-revalidate), then everything
  else with a cache that browsers always revalidate and CloudFront keeps for a day.
- Invalidates `/*` (one of CloudFront's 1,000 free paths a month) and waits
  for it to finish.
- Only once that invalidation completes, deletes files the new build no
  longer has -- so nothing drops a file a cached old page might still need.

The CloudFront function (`infra/modules/static_site/viewer_request.js.tftpl`)
serves `/services/` from `services/index.html`, since a plain S3 origin doesn't
resolve directory indexes, 301-redirects `/services` to `/services/`, and
301-redirects `www` to the primary host. A real 404 with the site's own 404
page for anything missing comes from the distribution's custom error responses
(403 and 404 both return `/404.html` with status 404).

## What Terraform doesn't do

- Create your AWS account, or run `aws login` for you
- Change the name servers at Namecheap (step 4, once)
