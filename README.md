# Website on AWS

All Terraform. The static site costs almost nothing to run. Two stacks:

- **`infra/bootstrap`** holds what must outlive everything else: the state bucket, the Route 53 delegation set, the GitHub Actions Terraform role, the budget alert and, once the domain is in Route 53, the registered domain. You apply it by hand, once.
- **`infra`** is the main stack: the site at `example.com` and `www.example.com`, and the mail server for that domain. A merge to `main` applies it through GitHub Actions. With an empty `domain_name` it deploys only the site, on its CloudFront domain.

```
Browser ──> Route 53 ──> CloudFront ──> S3   (website files)
```

## Where this goes

Put all of it in your website's git repo. Commit the `.terraform.lock.hcl` files;
they are not secret. The `.gitignore` already keeps state files, plan files and
`*_override.tf` out too.

## Layout

```
infra/
  deploy.sh                      <- laptop plan | apply | publish for the main stack
  publish-guard.sh               <- vets the build output before publish uploads it
  destroy-allowlist.txt          <- resources CI's plan guard lets a plan delete or replace
  backend.tf                     <- S3 state backend for the main stack
  main.tf, dns.tf, iam.tf, variables.tf, outputs.tf
  bootstrap/                     <- applied by hand once: state bucket, delegation set, CI role, budget, registered domain
  modules/                       <- static_site, certificate, mailserver
                                    (static_site carries its own tests/)
  tests/                         <- publish-guard.sh tests
app/
  web/                   <- the real site (Next.js static export)
scripts/                 <- reference-capture and media-render helpers, and plan-guard.sh (CI's plan guard)
docs/                    <- site copy drafts, plans, findings, future notes
.github/workflows/       <- ci.yml (checks) and deploy.yml (deploy on merge to main)
.mise.toml               <- pinned tool versions
lefthook.yml             <- git hooks (pre-commit, pre-push)
app.env                  <- settings as op:// references into 1Password
```

## Cost

| Piece              | Cost                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------- |
| Domain             | whatever your registrar charges you yearly                                            |
| Route 53 DNS zone  | $0.50/month                                                                           |
| HTTPS certificates | $0                                                                                    |
| S3 + CloudFront    | pennies at low traffic                                                                |
| Mail server        | an EC2 instance (`instance_type`), an EBS volume (`mail_volume_gb`) and an Elastic IP |
| Budget alerts      | $0                                                                                    |

The Route 53 zone and the mail server are the _fixed_ costs. With an empty
`domain_name` neither is created.

## One-time setup

**You need:** Terraform 1.16+, AWS CLI v2, the 1Password CLI
(`op`), signed in, bash (macOS/Linux, or WSL / Git Bash on Windows), and an AWS
account on the **Paid** plan (the Free plan closes the account after six months).

### 1. AWS access keys

`deploy.sh` takes AWS credentials only from 1Password, never from AWS profiles.
`AWS_SECRET_ID`, `AWS_SECRET_KEY` and `AWS_REGION` in `app.env` point at the
`mccor-labs` item in the Development vault (fields `AWS_SECRET_ID`,
`AWS_SECRET_KEY`, `region`). Any `AWS_PROFILE` in your shell is ignored. Run `op signin`, then check:

```bash
op run --env-file=app.env -- aws sts get-caller-identity
```

### 2. Fill in your settings

Settings live in 1Password, in the `Development` vault under the `mccor-labs` item that `app.env` points at. Fill in its fields there: `name`, `region`, `domain_name`, `alert_email`, `delegation_set_id`, `mailboxes` (a Terraform map, e.g. `{ marcm = "Marc M" }`), `admin_mailbox`, `instance_type`, `mail_volume_gb`, `github_subject_prefix`, `booking_url`, `monthly_budget_usd`, `domain_registrar_is_route53`, `domain_contact`, `AWS_SECRET_ID`, `AWS_SECRET_KEY`. Don't edit `app.env` itself. It's committed, and it only holds `op://` references. `deploy.sh` resolves them with `op run` and passes them to Terraform as environment variables, so nothing is written to disk. Install the 1Password CLI and run `op signin` first.

Two fields need care. `delegation_set_id` is the one you fill in after step 3, from the bootstrap output. `domain_registrar_is_route53` stays `false` until the domain has been transferred to Route 53. `domain_contact` holds the registrant contact as JSON, or the literal `null` until then, and is never left empty.

### 3. Apply the bootstrap stack

You apply `infra/bootstrap` by hand, once, from your laptop. The first apply runs on local state, with `TF_VAR_ENABLE_BUDGET=false` if another stack still owns a budget with the same name. Then `terraform init -migrate-state` moves the state into the versioned S3 bucket the stack created (see `infra/bootstrap/backend.tf`), so it does not stay on your machine. `deploy.sh` does not run it. The exact commands and checks are in the "Revised live order" section of the addendum in `docs/plans/ci-terraform-apply.md`.

Afterwards, put the `delegation_set_id` output in the `delegation_set_id` field in 1Password. The `name_servers` output lists the four name servers for step 4.

### 4. Point Namecheap at Route 53

Namecheap → **Domain List** → **Manage** next to your domain → **Nameservers** →
choose **Custom DNS** → enter the four name servers from step 3 → click the
green checkmark. That's the only thing to change at Namecheap; every other DNS
record lives in Route 53 once the main stack is applied.

Wait until the change is live (often minutes, up to 48 hours):

```bash
dig +short NS example.com
```

When it lists the `awsdns` name servers, continue. (Windows: `nslookup -type=ns example.com`.)

## Deploying

A push to `main` runs `.github/workflows/deploy.yml`, which:

1. lints, type-checks and unit-tests the site, then builds it;
2. plans the main stack, checks the plan with `scripts/plan-guard.sh` against `infra/destroy-allowlist.txt` (a plan that deletes or replaces anything not listed fails), and applies it;
3. uploads the build to S3, invalidates CloudFront and checks the live site.

CI assumes GitHub OIDC roles instead of storing AWS keys, and reads `app.env` through a 1Password service account (the `OP_SERVICE_ACCOUNT_TOKEN` secret).

From your laptop, `deploy.sh` runs the same main stack with your own admin keys and skips the plan guard, so treat it as break-glass:

```bash
./infra/deploy.sh plan           # preview only
./infra/deploy.sh                # apply, the default action
./infra/deploy.sh apply          # the same, spelled out
```

Terraform shows the plan and asks for `yes` before changing anything. The first
deploy takes a while (certificate + CloudFront).

If `terraform init` changes `infra/.terraform.lock.hcl` or
`infra/bootstrap/.terraform.lock.hcl`, commit the change.

## Deleting

The main stack is removed from your laptop only. `deploy.sh` has no destroy action, and CI's plan guard blocks deletes. Its site bucket refuses to be deleted while it holds files, so turn that protection off first, then destroy:

```bash
op run --no-masking --env-file=app.env -- terraform -chdir=infra init
op run --no-masking --env-file=app.env -- env TF_VAR_PROTECT_DATA=false \
  terraform -chdir=infra apply -target=module.site
op run --no-masking --env-file=app.env -- env TF_VAR_PROTECT_DATA=false \
  terraform -chdir=infra destroy
```

**This permanently deletes the live site, every file in it and the mail server with its mail volume.**

The bootstrap stack in `infra/bootstrap` is permanent: its state bucket and delegation set carry `prevent_destroy`, so there is no destroy step for it. The zone's name servers survive a destroy because they belong to the delegation set.

## Your real frontend

The site in `app/web` is already the real frontend: a Next.js static export,
built and uploaded by the deploy workflow on every merge to `main`, or by
`./infra/deploy.sh publish` from your laptop (see "Building and deploying"
below). There is no backend yet: `app/` holds only `web`, and the stack has no
logins, database or API.

## The website

The marketing site lives in `app/web`. It is a Next.js app that builds to plain
static files, deployed to the same S3 bucket and CloudFront distribution as
everything else here.

Requirements: Node 24 and pnpm 12.9.1 (both pinned in `.mise.toml`; pnpm also by
`packageManager` in `package.json`), and the 1Password CLI (`op`), signed in.

Node and pnpm come from mise, so no `PATH` changes are needed. The committed
`.mise.toml` pins node 24, pnpm 12.9.1, terraform 1.16.1, tflint 0.64.0 and trivy
0.74.0. The git hooks put `~/.local/share/mise/shims` on `PATH` themselves.

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
- Values live in 1Password, in the `Development` vault under the `mccor-labs` item. The references are in `app.env`, which is committed because it holds `op://` paths, not values.
- `pnpm dev` and `pnpm build` strip the AWS keys from the environment and set `NEXT_PUBLIC_SITE_URL` to `https://` plus `DOMAIN_NAME`, which comes from the `domain_name` field.
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
seconds. When a commit touches `.tf` files it also runs `terraform fmt`,
`terraform validate` and tflint. `git push` runs the full gate: type-check, lint,
format check, unit tests, a production build, smoke tests and the Terraform
format check, validate and tflint. CI (`.github/workflows/ci.yml`) runs the same
site checks on every pull request and push to `main`, plus the full end-to-end
suite, the plan guard and publish guard tests, and a trivy scan of `infra`. To
run most of the site checks by hand:

```bash
pnpm verify
```

`pnpm verify` is type-check, lint, format check, unit tests and the build. The
end-to-end tests are separate:

```bash
pnpm -F web test:e2e           # full suite
pnpm -F web test:e2e:smoke     # the @smoke subset, which is what pre-push runs
```

Those run **Chromium headless** (the Desktop Chrome device), and only Chromium
-- it is the one engine the Playwright config declares. The `budgets` project
(`budgets.spec.ts`, in the full suite but not the smoke subset) runs on the
Google Chrome channel instead. On a fresh machine, install both first:

```bash
pnpm exec playwright install chromium chrome
```

Chromium goes into the shared `~/Library/Caches/ms-playwright/` cache, not into
the repo, so other projects on the machine share it. Adding another engine to
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

That writes `app/web/out/` for local checks. A merge to `main` goes live through
the deploy workflow. To publish from your laptop instead:

```bash
./infra/deploy.sh publish
```

This needs the main stack already deployed (`./infra/deploy.sh apply`, or a
deploy workflow run, first). `publish` then:

- Refuses to build if anything under `app/`, `package.json`,
  `pnpm-lock.yaml`, `pnpm-workspace.yaml` or `.mise.toml` is uncommitted
  or untracked, or if a gitignored env file matching `app/web/.env*` (such as
  `.env.local`) exists -- publish only ever builds committed code, with its
  env coming only from the committed `app.env`.
- Builds under `op run` with only `DOMAIN_NAME` and the `NEXT_PUBLIC_*` settings
  left in the environment (no AWS keys or Terraform variables), setting
  `NEXT_PUBLIC_SITE_URL` to the stack's `site_url` output, so the sitemap,
  `robots.txt` and `metadataBase` always name the right host.
- Vets the snapshot with `infra/publish-guard.sh` before uploading, and refuses
  on a symlink, a dotfile, a file type outside the allowed list (html, txt, js,
  css, json, xml, woff2, webp, avif, jpg, svg, mp4, webm, glsl), a file named
  like one in `rejected-media/`, or any git-ignored file under `app/web/public`.
  It also refuses if `index.html` or `404.html` is missing, or if `robots.txt`
  doesn't name this site's sitemap.
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
301-redirects `www` to the primary host (skipped when `domain_name` is empty). A
real 404 with the site's own 404 page for anything missing comes from the
distribution's custom error responses (403 and 404 both return `/404.html` with
status 404).

## What Terraform doesn't do

- Create your AWS account or its access keys
- Create the GitHub OIDC identity provider (`token.actions.githubusercontent.com`) in your AWS account; both stacks only look it up
- Create the 1Password service account or the `OP_SERVICE_ACCOUNT_TOKEN` GitHub secret that CI uses
- Change the name servers at Namecheap (step 4, once)
- Register or transfer the domain; `infra/bootstrap` only manages it once it is in your Route 53 account
