# Task 9 Report: Layout shell and the ten route skeletons

Status: BLOCKED — Steps 1-10 and lint/typecheck done and verified; Step 11 (build) blocked on a
missing 1Password item. No commit made. See bottom of report for full detail.

## Plan

Following brief steps 1-13 in order. TDD: write layout.test.tsx first (Step 1), capture real RED
(Step 2), implement primitives + Header/Footer (Steps 3-4), capture real GREEN (Step 5), then
PageHeader, root layout, home route, eight inner routes, 404 (Steps 6-10), then build/export
verification (Steps 11-12), then commit (Step 13).

## Step 1: layout.test.tsx

Written verbatim from brief at `app/web/src/components/layout/layout.test.tsx`.

## Step 2: RED — real failing output

Command:
```
$ PATH=/opt/homebrew/bin:$PATH pnpm -F web exec vitest run src/components/layout
```

Real output (abridged):
```
 FAIL  src/components/layout/layout.test.tsx [ src/components/layout/layout.test.tsx ]
Error: Failed to resolve import "./Header" from "src/components/layout/layout.test.tsx". Does the file exist?
  Plugin: vite:import-analysis
  File: /Users/mj/repos/mccor-labs/app/web/src/components/layout/layout.test.tsx:4:23
  2  |  import { render, screen } from "@testing-library/react";
  3  |  import { Footer } from "./Footer";
  4  |  import { Header } from "./Header";
     |                          ^
  5  |  import { SkipLink } from "./SkipLink";
  6  |  import { footerNav, nav } from "@/content/nav";

 Test Files  1 failed (1)
      Tests  no tests
```

Matches the brief's expectation of "FAIL — cannot resolve" a sibling module. The brief named
`./Footer` as the unresolved import; Vite's resolver actually reports `./Header` first (it's the
next import line after the one `./Footer` line, and Vite fails on the first module it cannot
resolve in source order — both are equally nonexistent at this point). Same failure class, cause,
and fix. Neither file exists yet, which is exactly the expected RED state.

## Steps 3-4: primitives, Header, Footer

Created verbatim from the brief:
- `app/web/src/components/layout/Container.tsx`
- `app/web/src/components/layout/Section.tsx`
- `app/web/src/components/layout/SkipLink.tsx`
- `app/web/src/components/layout/Header.tsx`
- `app/web/src/components/layout/Footer.tsx`

**One disclosed deviation** in `BookingCta.tsx`: the brief's `type BookingCtaProps = { size?: ... }`
became `interface BookingCtaProps { size?: ... }` — same mechanical fix as Task 8's `ButtonProps`,
required by `@typescript-eslint/consistent-type-definitions` (set to `interface` in
`eslint.config.ts`'s `strictTypeChecked`/`stylisticTypeChecked` block for `app/web/**/*.{ts,tsx}`).
Confirmed by lint passing at 0 exit later in this report. No other change to that file.

## Two real test-environment bugs found and fixed at Step 5 (not in the brief)

First GREEN attempt with the brief's files verbatim **failed**, with two distinct real failures —
neither caused by anything in the layout components as written:

**Bug 1 — `next/link` drops the trailing slash under Vitest.** `nav` items carry hrefs like
`/services/` (matching `next.config.ts`'s `trailingSlash: true`). Rendered under Vitest, `next/link`
produced `href="/services"` — the trailing slash silently vanished. Isolated with a standalone
repro (`<Link href="/services/">`, asserted `toHaveAttribute('href', '/services/')` — failed,
received `/services`). Root cause: Next's real build injects
`process.env.__NEXT_TRAILING_SLASH` via webpack `DefinePlugin` from `next.config.ts`'s
`trailingSlash` option; Vitest never runs that build step, so `next/link` falls back to its
`trailingSlash: false` default. Confirmed the fix empirically: setting
`process.env.__NEXT_TRAILING_SLASH = 'true'` before `next/link` is imported anywhere makes the
repro pass. This is not a workaround to dodge the assertion — it reproduces the one config value
(`trailingSlash: true`) that the real static export always has, so the test now exercises the
same behaviour production actually ships.

**Bug 2 — no cleanup between tests, so DOM from one `it()` leaks into the next.**
`vitest.config.ts` sets `globals: false`. `@testing-library/react`'s auto-cleanup only registers
itself when it finds a global `afterEach` function at module-load time; with `globals: false` that
global never exists, so auto-cleanup silently never runs. The Header CTA test (second `it()` in the
`Header` describe block) failed with "Found multiple elements with the role 'link' and name 'Email
us directly'" — two Header renders (one per test) were both still in the DOM. This was latent
before this task: `button.test.tsx` renders 5 times across 5 tests but never collides because each
test uses a distinct accessible name; `layout.test.tsx` is the first suite where two tests in the
same describe block render the same component in the same state.

**Fix — `app/web/src/test/setup.ts`**, which is test infrastructure, not the test itself (rule 1 is
about not weakening a test to pass buggy code — this changes neither `layout.test.tsx` nor any
component; it repairs a shared setup file so both the value asserted and the isolation the test
relies on match what the framework is supposed to provide):

```ts
// next/link reads the trailing-slash behaviour from this flag, which next.config.ts's real
// webpack build injects via DefinePlugin from the `trailingSlash` option. Vitest never runs that
// build step, so without setting it here `next/link` silently strips the trailing slash that
// `trailingSlash: true` adds in the actual static export — component tests would then pass on
// hrefs the production site never serves. Set to match next.config.ts.
process.env.__NEXT_TRAILING_SLASH = 'true'

import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// vitest.config.ts sets `globals: false`, so @testing-library/react's own auto-cleanup (which
// only registers when it finds a global `afterEach`) never fires. Without this, one test's
// rendered DOM leaks into the next test in the same file, which breaks any query that expects a
// single match.
afterEach(() => {
  cleanup()
})
```

Verified the fix does not regress the other five existing suites (see full-suite run below), then
re-ran `src/components/layout` for the real GREEN capture.

## Step 5: GREEN — real passing output

Command:
```
$ PATH=/opt/homebrew/bin:$PATH pnpm -F web exec vitest run src/components/layout
```

Real output:
```
 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  14:29:45
   Duration  1.06s
```

All four tests pass: Header renders every primary nav destination with the correct href, Header's
CTA test, Footer renders every footer destination, SkipLink targets `#main`.

**CTA branch actually exercised**: `env.bookingUrl === null` under `NODE_ENV=test` (confirmed — the
test's `if (env.bookingUrl === null)` branch is what ran; no `NEXT_PUBLIC_BOOKING_URL` is set in
this shell). The test asserted `getByRole('link', { name: ui.contactFallback })` has
`href="mailto:marcm@mccorlabs.com"`, matching `site.contactEmail`. The `else` branch (real booking
URL, `rel="noopener"`) was not exercised by this run.

Regression check — full existing suite after the `setup.ts` change:
```
$ PATH=/opt/homebrew/bin:$PATH pnpm -F web exec vitest run
 Test Files  6 passed (6)
      Tests  40 passed (40)
```
All pre-existing suites (button, content, env, tokens) still pass — the `setup.ts` change is
additive, not disruptive.

## Steps 6-10: PageHeader, root layout, home route, eight inner routes, 404

All created verbatim from the brief, with the same `interface` mechanical fix applied to
`PageHeaderProps` (brief has `type PageHeaderProps = {...}`) for the same
`consistent-type-definitions` reason as `BookingCtaProps` above. No other deviations.

Files:
- `app/web/src/components/sections/PageHeader.tsx`
- `app/web/src/app/layout.tsx`
- `app/web/src/app/page.tsx`
- `app/web/src/app/services/page.tsx`, `work/page.tsx`, `about/page.tsx`, `process/page.tsx`,
  `contact/page.tsx`, `careers/page.tsx`, `privacy/page.tsx`, `terms/page.tsx` — each per the
  brief's table (directory, component name, title, description) verbatim.
- `app/web/src/app/not-found.tsx`

## Lint and typecheck (pre-build)

```
$ PATH=/opt/homebrew/bin:$PATH pnpm -F web lint
$ eslint .
EXIT_CODE=0
```

```
$ PATH=/opt/homebrew/bin:$PATH pnpm -F web exec tsc --noEmit
EXIT_CODE=0
```

Both clean, no deviations needed beyond the two `interface` fixes already disclosed.

## Step 11: BLOCKED — build fails on `op`

Command (root `pnpm build`, per ruling 2 — not `pnpm -F web build`, not `build:raw`):
```
$ PATH=/opt/homebrew/bin:$PATH pnpm build
```

Real output:
```
$ op run --env-file=app/web/.env.template -- pnpm -F web build
[ERROR] 2026/09/29 14:31:47 could not resolve item UUID for item mccor-labs: could not find item mccor-labs in vault iwti5j2ehzrbyjhemckm66ke6q
[ELIFECYCLE] Command failed with exit code 1.
```

Read-only diagnostics (no writes attempted, nothing in `infra/` touched):
```
$ op whoami
URL:               https://my.1password.com
Integration ID:    T6INIXUYOZEGZO5JLJLTDIXNS4
User Type:         SERVICE_ACCOUNT
EXIT=0

$ op vault list
ID                            NAME
iwti5j2ehzrbyjhemckm66ke6q    Development
```

`op` is signed in (valid service-account session) and the `Development` vault it needs is
reachable and matches `iwti5j2ehzrbyjhemckm66ke6q` from the error. `app/web/.env.template` expects
an item literally named `mccor-labs` inside that vault:
```
# Vault: Development · Item: mccor-labs
NEXT_PUBLIC_SITE_URL=op://Development/mccor-labs/site_url
NEXT_PUBLIC_BOOKING_URL=op://Development/mccor-labs/booking_url
NEXT_PUBLIC_CONTACT_ENDPOINT=op://Development/mccor-labs/contact_endpoint
```
That item does not exist in the vault. This is a 1Password provisioning gap (someone needs to
create the `mccor-labs` item with `site_url` / `booking_url` / `contact_endpoint` fields in the
`Development` vault), not a code defect in anything this task touched, and not something in scope
for Task 9 to fix. Per ruling 2, stopping here rather than routing around it with `build:raw` —
that would build without `NEXT_PUBLIC_BOOKING_URL`, silently validating the wrong thing (the
email-fallback CTA path) instead of the real production path, and would not prove the static
export actually works.

**Steps 11, 12 and 13 are therefore BLOCKED.** Everything upstream of the build (Steps 1-10, lint,
typecheck) is done and independently verified above. No commit has been made — the brief's Step 13
commit is contingent on Step 11/12 passing, and they have not.

## Unrelated observation, not touched

`git status --short` at the point of stopping:
```
 M app/web/src/test/setup.ts
 M infra/deploy.sh
 M infra/settings.auto.tfvars.tpl
?? app/web/src/app/
?? app/web/src/components/layout/
?? app/web/src/components/sections/
```
`infra/deploy.sh` was already modified and unstaged before this session started (per the task
brief). `infra/settings.auto.tfvars.tpl` is also modified but this session never wrote to it —
confirmed via `git diff --stat infra/` and `git log -1 -- infra/settings.auto.tfvars.tpl` (last
commit 2026-09-27, two days before this session). Consistent with ruling 5's note that `infra/`
belongs to another concurrent session. Left untouched, unstaged, unreverted.

## Files created this session (all untracked, none staged, none committed)

- `app/web/src/components/layout/Container.tsx`
- `app/web/src/components/layout/Section.tsx`
- `app/web/src/components/layout/SkipLink.tsx`
- `app/web/src/components/layout/BookingCta.tsx`
- `app/web/src/components/layout/Header.tsx`
- `app/web/src/components/layout/Footer.tsx`
- `app/web/src/components/layout/layout.test.tsx`
- `app/web/src/components/sections/PageHeader.tsx`
- `app/web/src/app/layout.tsx`
- `app/web/src/app/page.tsx`
- `app/web/src/app/not-found.tsx`
- `app/web/src/app/{services,work,about,process,contact,careers,privacy,terms}/page.tsx`

## Files modified this session

- `app/web/src/test/setup.ts` — added `process.env.__NEXT_TRAILING_SLASH = 'true'` and
  `afterEach(cleanup)`. Not in the brief's file list, but required to make the brief's own
  `layout.test.tsx` pass against the brief's own `Header.tsx`/`Footer.tsx`; see the "Two real
  test-environment bugs" section above for full justification. This file is not under `infra/`.

## Concerns for the team lead

1. **Action needed outside this task's scope**: create the `mccor-labs` item in the `Development`
   1Password vault (`site_url`, `booking_url`, `contact_endpoint` fields) so `pnpm build` can run.
   I did not attempt this — it is a credential/infra provisioning action, not a code fix, and
   outside what Task 9 authorizes me to do.
2. **`setup.ts` deviation**: flagging clearly per ruling 3's disclosure requirement — this file
   was not in the brief's "Create" list, and I modified rather than created it. It was necessary
   for the brief's own literal test/component pair to pass; without it, `layout.test.tsx` fails
   for reasons unrelated to `Header.tsx`/`Footer.tsx` correctness (see above). Recommend a reviewer
   double-check this reasoning independently since it touches shared test infrastructure other
   suites depend on (regression run confirms 6/6 files, 40/40 tests still pass).
3. Task 9's own verification is otherwise complete and green: TDD RED→GREEN captured, lint 0,
   tsc 0. Only the build step is blocked, and only on `op`/1Password provisioning.

Status: **BLOCKED at Step 11 (build fails on `op`)**. Awaiting either the `mccor-labs` 1Password
item being created, or further instruction.
