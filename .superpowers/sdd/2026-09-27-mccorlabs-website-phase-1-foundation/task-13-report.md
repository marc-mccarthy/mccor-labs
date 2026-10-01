# Task 13 — README and full phase verification

Branch `feat/mail-server`. Starting HEAD `08b2387`.
Working tree at start: only `infra/deploy.sh`, `infra/settings.auto.tfvars.tpl`,
`infra/terraform.env` modified (owned by another session — untouched throughout).

## State gathered before writing

- `lefthook.yml` pre-push `typecheck.fail_text` is exactly `Type errors. Fix before pushing.`
- `app/web/playwright.config.ts` has one project: `firefox` (Desktop Firefox, headless default).
- Root `package.json`: `dev` and `build` both run through
  `op run --env-file=app/web/.env.template --`; `build:raw` is the unwrapped escape hatch.
- `app/web/.env.template` references `op://Development/mccorlabs/...` — item `mccorlabs`, no hyphen.
- `.node-version` is `24`. `packageManager` is `pnpm@12.6.0`.
- `.git/hooks/pre-commit` and `.git/hooks/pre-push` both exist (dated Sep 28 00:20).

## Step 1 — README sections

(in progress)

Added 101 lines to `README.md` after the *Your real frontend* section, before
*What Terraform doesn't do*. Purely additive — `git diff --stat README.md` reads
`1 file changed, 101 insertions(+)`. `prettier --write README.md` reported
`unchanged`, so the new prose already matches the repo's style.

Sections added: **The website** / Running it locally / Editing content / Checks /
Building and deploying. Departures from the brief's literal text, all because the
brief's prose no longer matches the repo:

- `pnpm approve-builds lefthook` is no longer presented as sufficient. The README
  now says approval is necessary but the hook files only appeared once a
  committed `lefthook.yml` with active jobs existed, and gives
  `pnpm exec lefthook install` as the recovery step. The
  `test -f .git/hooks/pre-commit` confirmation is kept verbatim.
- The 1Password item is `mccorlabs` (no hyphen), not `mccor-labs`. Verified in
  `app/web/.env.template`: `op://Development/mccorlabs/site_url`.
- Added `pnpm build:raw` as the documented unwrapped escape hatch.
- Added an end-to-end subsection: `pnpm -F web test:e2e` /
  `test:e2e:smoke`, **Firefox headless only**,
  `pnpm exec playwright install firefox` on a fresh machine, browsers in the
  shared `~/Library/Caches/ms-playwright/`.
- `pnpm verify` is described as type-check, lint, format check, unit tests and
  build — not "the full gate" — because it does not run e2e. Pre-push does.
- The "routes other than `/` do not work in production yet" warning is kept.

## Step 2 — `pnpm verify`

**Result: exit 0.** Run as `PATH=/opt/homebrew/bin:$PATH pnpm verify`.

    $ pnpm -F web exec tsc --noEmit && pnpm -F web lint && pnpm format:check && pnpm -F web test:run && pnpm build
    $ eslint .
    $ prettier --check .
    Checking formatting...
    All matched files use Prettier code style!
    $ vitest run
     RUN  v5.0.2 /Users/mj/repos/mccor-labs/app/web
     Test Files  9 passed (9)
          Tests  64 passed (64)
       Duration  1.25s
    $ op run --env-file=app/web/.env.template -- pnpm -F web build
    $ next build
    ▲ Next.js 16.3.6 (Turbopack)
    ✓ Compiled successfully in 549ms
    ✓ Generating static pages using 9 workers (13/13) in 140ms
    Route (app)
    ┌ ○ /           ├ ○ /_not-found  ├ ○ /about      ├ ○ /careers
    ├ ○ /contact    ├ ○ /privacy     ├ ○ /process    ├ ○ /robots.txt
    ├ ○ /services   ├ ○ /sitemap.xml ├ ○ /terms      └ ○ /work
    ○  (Static)  prerendered as static content

13 static pages: the ten routes plus `/_not-found`, `/robots.txt` and
`/sitemap.xml`.

### `pnpm verify` is not idempotent — reportable finding, not papered over

`next build` rewrites `app/web/tsconfig.json` (`jsx` to `react-jsx`, adds
`.next/dev/types/**/*.ts` to `include`, and re-indents every array one entry per
line) and `app/web/next-env.d.ts` (adds two `import` lines). Prettier's
`printWidth: 90` disagrees with Next's re-indentation, so running `pnpm verify`
a second time **fails**:

    ===SECOND VERIFY EXIT: 1===
    $ prettier --check .
    Checking formatting...
    [warn] app/web/next-env.d.ts
    [warn] app/web/tsconfig.json
    [warn] Code style issues found in 2 files. Run Prettier with --write to fix.
    [ELIFECYCLE] Command failed with exit code 1.

Type-check and lint both still passed on that second run, so the `jsx` change is
harmless to compilation; only `format:check` objects. After
`git checkout -- app/web/tsconfig.json app/web/next-env.d.ts`, a third run exited
**0** again, which is the figure quoted above.

The same mechanism affects the pre-push hook: its `build` step leaves the tree
dirty, so a second `git push` without reverting those two files fails at
`format-check` with a message that points at formatting rather than at the build
that caused it. Not fixed here — fixing it means changing `.prettierignore` or
the verify script, which is outside this task's one-file scope.

## Step 3 — export shape

Output was exactly one line, no `MISSING`:

    export check done

`app/web/out/` listing confirms `404.html`, `index.html`, `robots.txt`,
`sitemap.xml` and the eight route directories.

## Step 4 — pre-push gate blocks a bad push

(in progress)
**The push was refused.** `git push --dry-run` exited **1**. Probe commit
`fbb0ce0 test: type probe`, committed with `--no-verify`, carrying
`app/web/src/__typeprobe.ts` containing
`export const broken: number = "not a number"`.

The hook's own summary, verbatim:

    summary: (done in 27.28 seconds)
    ✔️ e2e (6.38 seconds)
    ✔️ lint (3.59 seconds)
    ✔️ test (1.92 seconds)
    🥊 build: Production build failed. (3.93 seconds)
    🥊 format-check: Formatting drift. Run: pnpm format (0.98 seconds)
    🥊 typecheck: Type errors. Fix before pushing. (1.44 seconds)
    error: failed to push some refs to 'github.com:marc-mccarthy/mccor-labs.git'

`typecheck: Type errors. Fix before pushing.` is the exact `fail_text` from
`lefthook.yml`. The underlying compiler error, also verbatim:

    src/__typeprobe.ts(1,14): error TS2322: Type 'string' is not assignable to type 'number'.

Nothing was pushed — `--dry-run` contacts the remote but transfers no objects,
and the hook refused before that point regardless. `origin/feat/mail-server` was
never written to.

Two incidental observations, neither a defect:

- Three of six pre-push commands failed, not one. `build` fails because
  `next build` type-checks too. `format-check` fails because the probe file is
  unformatted *and* because the `build` step in this same hook run rewrote
  `tsconfig.json` and `next-env.d.ts` — the non-idempotency above, reproduced
  inside the real gate.
- The gate does not stop at the first failure; it ran all six commands and
  reported at the end, 27.28s total. The e2e smoke subset passed: 14 tests,
  5.8s, Firefox.

## Step 5 — probe removed

**Deviation, deliberate, and the reason the ruling-4 confirmation existed.**
`git log --oneline -2` confirmed the required identity: `HEAD` was `fbb0ce0`
(my probe), `HEAD~1` was `08b2387`. But `git status --short` at that moment read:

     M README.md
     M app/web/next-env.d.ts
     M app/web/tsconfig.json
     M infra/deploy.sh
     M infra/settings.auto.tfvars.tpl
     M infra/terraform.env

`git reset --hard HEAD~1` discards working-tree changes to tracked files, so it
would have destroyed the 101 uncommitted README lines **and reverted the three
`infra/` files another session owns** — which the task forbids touching. I ran
the non-destructive equivalent instead:

    git reset HEAD~1          # mixed: moves HEAD, leaves the working tree alone
    rm -f app/web/src/__typeprobe.ts
    git checkout -- app/web/tsconfig.json app/web/next-env.d.ts

Same end state for the probe, no other file touched. Verified:

    clean
    08b2387 test(web): Playwright route, accessibility, contact and motion suites
    8df1e5a refactor(web): move contact copy into the content layer
    7a52f19 fix(web): use the on-accent token for the skip link label

`git ls-files | grep typeprobe` returns nothing — the probe is in neither the
index nor the tree, and no probe commit survives.

## Step 6 — commit

    8c24f9b docs(web): local development and deployment
     1 file changed, 101 insertions(+)

Pre-commit ran: `format` reported `README.md 41ms (unchanged)`, `lint` skipped
(no `.ts`/`.tsx` staged). Message ends with
`Claude-Session: https://claude.ai/code/session_01NmDcxWpvxAk2pC2emhuVYS`.

`git status --short` immediately before and after the commit showed only the
three `infra/` files owned by another session. They were never staged, reverted
or stashed.

Final log:

    8c24f9b docs(web): local development and deployment
    08b2387 test(web): Playwright route, accessibility, contact and motion suites
    8df1e5a refactor(web): move contact copy into the content layer

## Step 7 — status report to the owner

> Phase 1 complete. The site builds and all checks pass locally: `pnpm verify`
> green, ten routes plus `404.html` exported with distinct content, accessibility
> suite clean, hooks verified to block a bad push. Nothing is deployed. Route
> resolution and 404 status in production remain unverified and depend on the
> CloudFront handoff in phase 4.

Both of the accompanying claims were checked against the filesystem rather than
asserted.

### `TODO(owner)` markers under `app/web/src/content/`

**None.** `grep -rn "TODO(owner)" app/web/src/content/` returns no matches. The
directory holds `site.ts`, `nav.ts`, `types.ts`, `ui.ts` and `content.test.ts`;
`site.ts` in particular carries no marker.

Three do exist, but outside the website source, in `docs/content/team.md` — team
bios invented during drafting and awaiting correction. They become phase-2 work
when `src/content/team.ts` is written from that file:

    docs/content/team.md:52:<!-- TODO(owner): invented apart from the role. Nate to correct or replace. -->
    docs/content/team.md:75:<!-- TODO(owner): invented. Kirsten to correct or replace. -->
    docs/content/team.md:96:<!-- TODO(owner): invented. Ashley to correct or replace. -->

### Phase 2 is blocked on the reference corpus

Confirmed, with a nuance the owner needs. `docs/ui-references/` is **not empty** —
it holds a v1 corpus: ten ranked site directories, each with
`design-tokens.json`, 2–5 screenshots and one `scroll.mp4`, plus `_findings/`
(five primary-source files), `README.md` and `STACK-COMPARISON.md`; 4,624 files
in total.

But that is not a tier-1 capture. `docs/superpowers/specs/2026-09-27-ui-reference-corpus-design.md:38`
defines tier 1 as all four viewports, home plus up to three internal routes, both
`native` and `live` passes, state deltas, page-transition capture and
signature-effect capture. The gate at
`docs/superpowers/specs/2026-09-27-mccorlabs-website-design.md:166` then requires
`design-system.json` and `extract.<viewport>.json` per site before
`design-director` may run. Searching the tree:

    find docs/ui-references -name 'design-system.json' -o -name 'extract.*.json'   -> no matches
    find docs/ui-references -type d \( -name states -o -name transitions \)        -> no matches

So the artefacts the revision gate reads do not exist in any form. **Phase 2 is
blocked until the corpus is re-captured at tier 1 for at least the four tier-1
sites.** The existing v1 data is useful input but cannot satisfy the gate, and
the spec is explicit that the placeholder visual values must not be treated as
measured.

## Concerns for the owner

1. **`pnpm verify` and `git push` are not idempotent.** Documented above. A
   second consecutive run fails at `format:check` on two files `next build`
   rewrote. Worst case: a developer sees `Formatting drift. Run: pnpm format`,
   runs `pnpm format`, and commits Next's regenerated `tsconfig.json` — which
   would persist `jsx: react-jsx` and the `.next/dev/types` include into the
   repo. Candidate fixes, none applied here (outside this task's scope): add
   `app/web/tsconfig.json` and `app/web/next-env.d.ts` to `.prettierignore`, or
   have the verify script restore them after the build.
2. **The README's own lefthook instructions are a reconstruction, not a replay.**
   The hooks were already installed when this task began
   (`.git/hooks/pre-commit`, dated Sep 28 00:20). The claim that
   `pnpm approve-builds lefthook` alone was insufficient comes from the task
   briefing's account of what happened earlier in this plan, not from a fresh
   clone tested here. The recovery command `pnpm exec lefthook install` is
   standard lefthook usage but was not exercised on a clean checkout.
3. **Production routing is genuinely unproven, by design of the test setup.**
   `playwright.config.ts` serves the export with `serve`, which resolves
   directory indexes; CloudFront with a plain S3 origin does not. The route and
   404 suites prove the export is correct and cannot prove production resolves
   it. This is the phase-4 CloudFront handoff.
