# Phase 1 carry-forward

Facts that phase 1's execution established, which phases 2, 3 and 4 must not
re-guess. Every item carries the evidence for it — a file and line, a command and
its output, or a commit — because a bare warning is easy to override and a
mechanism is not.

Two sources sit behind this document: the execution ledger at
`.superpowers/sdd/2026-09-27-mccorlabs-website-phase-1-foundation/progress.md`,
which records every ruling and defect as it happened, and the repository itself.
Where they disagree the repository wins; the one place they do is noted below.

**Note on tracking.** `.gitignore` lines 19, 22 and 23 ignore `**/ui-references/`,
`**/superpowers/` and `**/.superpowers/`, so the spec, every plan and the
execution ledger are untracked working-tree files, not committed history
(`git check-ignore -v` confirms each path, and `git ls-files docs/superpowers/`
returns nothing). Back them up outside git or commit the `.gitignore` change
first; a `git clean` would destroy the phase 2 plan. This document and the
prompt template live directly under `docs/`, which is not ignored, so they are
tracked.

---

## 1. Environment facts

### 1.1 pnpm resolves to a broken shim unless you prefix the PATH

`/Users/mj/.local/share/pnpm/pnpm` is a self-installing shim. The repository's
root `package.json` sets `"packageManager": "pnpm@12.6.0"`, and the shim honours
it by trying to fetch the platform build:

```
ERROR  Command failed with exit code 1: /Users/mj/.local/share/pnpm/pnpm add
@pnpm/macos-arm64@12.6.0 ...
  * latest-10: 10.34.6
```

`@pnpm/macos-arm64@12.6.0` is not published. Homebrew's pnpm, however, **is**
exactly 12.6.0 (`/opt/homebrew/bin/pnpm --version` → `12.6.0`), so nothing needs
downgrading or re-pinning. Prefix every pnpm command:

```bash
PATH=/opt/homebrew/bin:$PATH pnpm <command>
```

Prefixing is safe regardless of which pnpm the shell would otherwise find, and
prepending a directory that does not exist is a no-op on Linux and CI.

### 1.2 Git hooks carry the prefix themselves

Git runs hooks with its own PATH, not the shell's, so the prefix cannot be
inherited. All eight `run:` lines in `lefthook.yml` carry
`PATH=/opt/homebrew/bin:$PATH` inline, with a comment at the top of the file
explaining why. This was not cosmetic: before commit `aab1b57` ("fix(web):
resolve pnpm in git hooks via Homebrew PATH") every hook command died on the
shim, and the only reason the task had looked green was that the implementer had
prefixed the PATH by hand — which a real `git commit` does not do.

Any new hook command must carry the prefix too.

### 1.3 Installing the hooks takes an active `lefthook.yml`

`pnpm approve-builds lefthook` does not install the git hooks on its own, and
neither does a `lefthook.yml` with no active jobs. The hooks appeared only once
the real configuration with live `pre-commit` and `pre-push` commands was
written. Confirm, do not assume:

```bash
test -f .git/hooks/pre-commit && test -f .git/hooks/pre-push
```

Both are genuine lefthook POSIX-sh shims ending in `call_lefthook run
"pre-commit"` / `"pre-push"`, and they resolve the lefthook binary through a
hardcoded store path, independent of PATH — so only the pnpm calls _inside_
`lefthook.yml` were ever at risk. `pnpm-workspace.yaml` carries
`allowBuilds: { lefthook: true }`, so a fresh clone installs them.

A hook that never installed is indistinguishable from a hook that passes. The
only thing that tells them apart is a deliberate bad commit.

### 1.4 The 1Password item is `mccorlabs`, with no hyphen

`app/web/.env.template` is the contract, and it is committed because `op://`
references are pointers rather than secrets:

```
NEXT_PUBLIC_SITE_URL=op://Development/mccorlabs/site_url
NEXT_PUBLIC_BOOKING_URL=op://Development/mccorlabs/booking_url
NEXT_PUBLIC_CONTACT_ENDPOINT=op://Development/mccorlabs/contact_endpoint
```

`op item get mccorlabs --vault Development` returns a Secure Note with exactly
those three fields. `contact_endpoint` is **deliberately empty** — the API
Gateway endpoint is not provisioned, and `src/lib/env.ts` treats empty as unset.
Do not fill it with a placeholder; the contact form's degraded shape is tested
against its absence.

**This is the one place the ledger and the repository disagree.** The ledger
records creating an item named `mccor-labs`, because that is what the plan
specified. The item in the vault today is `mccorlabs`, and `.env.template`
references `mccorlabs`. The repository wins: the item was renamed after the
ledger entry was written. Use `mccorlabs`.

Never create a `.env.local`, and never hardcode a value the template references.

### 1.5 `pnpm dev` and `pnpm build` route through `op run`

The root `package.json` wraps both:

```json
"dev": "op run --env-file=app/web/.env.template -- pnpm -F web dev",
"build": "op run --env-file=app/web/.env.template -- pnpm -F web build",
"build:raw": "pnpm -F web build",
```

`build:raw` is the unwrapped escape hatch, for a build against an unconfigured or
locked vault. Only `dev` and `build` are wrapped, because `op` authorization is
per-process and TTY-bound — wrapping every script would mean a biometric prompt
per invocation.

The consequence worth knowing in advance: `pnpm verify` ends in `pnpm build`, and
`lefthook.yml`'s pre-push `build` command is `pnpm build`, so **a locked vault
fails the pre-push hook at its build step with an `op` error, not a code error.**
Check `op` before debugging the build. This is deliberate — `env.ts` makes a
production build throw when `NEXT_PUBLIC_BOOKING_URL` is absent, so that a build
made without 1Password cannot silently ship a site whose primary call to action
has degraded to email.

### 1.6 `next build` rewrites two files on every run

`next build` rewrites `app/web/tsconfig.json` and `app/web/next-env.d.ts` every
time, so any build leaves the tree dirty. Both are listed in `.prettierignore`
under the comment "next build regenerates these; Prettier must not police them".
**Neither may be committed.** Revert them after a build rather than staging them;
phase 1's Task 10 implementer caught and reverted exactly this.

### 1.7 The e2e runner is the pnpm package, pinned at the root

`@playwright/test` is pinned to exactly `1.61.0` in the **root**
`package.json`, never in `app/web`. Two Playwright versions in one repository is
the hazard the exact pin guards against, so never widen it to a caret range and
never add Playwright to `app/web`. The e2e specs resolve it through Node's
parent-directory walk, which is why no per-package install is needed.

`app/web/playwright.config.ts` declares a single `firefox` project — Firefox
headless, at the owner's preference, not Chromium. Headless is the default, so no
flag appears.

Browsers are cached in `~/Library/Caches/ms-playwright/`. Phase 1 installed
`chromium-1228` and `firefox-1532` with the owner's approval, after measuring
that the plan's blanket "never run `playwright install`" rested on two stale
premises: `chromium-1228` was absent from the cache, so Playwright 1.61.0 could
not launch at all and every e2e test failed at 0ms with `Executable doesn't exist
at .../chromium_headless_shell-1228/...`; and the disk was at 26% capacity with
39 GB free, not the 89% the root `package.json` comment still claims. Adding a
second browser project means installing its revision first.

**Homebrew's `playwright-cli` cannot substitute for it.** Formula 0.1.22
describes itself as "run playwright mcp commands from terminal"; its `--help`
lists `open`, `goto`, `click`, `snapshot` and a `pause-at`/`resume`/`step-over`
debugger, and **no `test` subcommand** — no assertions, no reporters, no axe
integration, so it cannot execute a `.spec.ts` suite. It remains the right tool
for the interactive browser driving the spec's design and shader checks call for,
which cannot be automated. Both share the same
`~/Library/Caches/ms-playwright/` cache, but the Homebrew CLI bundles its own
`playwright-core@1.64.0-alpha`, which wants different browser revisions.

### 1.8 pnpm only

Never `npm install` and never `yarn`. `app/web/package.json` must keep
`"name": "web"`: every script in the plans uses `pnpm -F web`, which filters on
the package `name` field rather than the directory, and with any other name pnpm
exits **0** with "No projects matched the filters" — so every hook and script
appears to pass while doing nothing.

---

## 2. Version facts

### 2.1 Majors the phase 1 plan guessed wrong

The plan's caret-ranged devDependencies were the plan author's guesses at current
majors. Four did not resolve, and the substitutions are now in the lockfile:

| Plan specified                    | Actual    | Why                             |
| --------------------------------- | --------- | ------------------------------- |
| `@testing-library/dom@^11`        | `^10`     | `^11` does not exist on npm     |
| `@testing-library/react@^17`      | `^16`     | `^17` does not exist on npm     |
| `@testing-library/user-event@^15` | `^14.6.7` | 14.x is the long-standing major |
| `eslint@^10`                      | `^9`      | see below                       |

`eslint@^10` is incompatible with `eslint-config-next@16.3.6`, which is itself
locked to `next@16.3.6`. That config pulls `eslint-plugin-react@7.37.5`, whose
rules call `context.getFilename()` — removed in ESLint 10 — so every file
crashes with `contextOrFilename.getFilename is not a function`. No newer
`eslint-plugin-react` exists. The repository runs ESLint 9 (`eslint@^9.39.5`),
and ESLint 9 and 10 share the flat-config API, so typescript-eslint, jsx-a11y,
`eslint-config-prettier` and all four project rules are unaffected. Revisit only
when `eslint-plugin-react` ships ESLint 10 support; it is then a one-line bump.

### 2.2 Exact pins, inviolable

A failure to install one of these is a blocker that stops the task. Do not
substitute, and do not widen to a caret range.

| Package                               | Version  |
| ------------------------------------- | -------- |
| `next`                                | `16.3.6` |
| `react`, `react-dom`                  | `19.3.0` |
| `tailwindcss`, `@tailwindcss/postcss` | `4.3.3`  |
| `prettier`                            | `3.9.9`  |
| `lefthook`                            | `2.1.14` |
| `@playwright/test`                    | `1.61.0` |

`eslint-config-next` is also pinned exactly, at `16.3.6`, because it tracks
`next`.

Everything else is caret-ranged. Where a caret major does not resolve, install
the newest major that does and record the substitution in the task report — but
say so; three of phase 1's mechanical deviations reached a commit undisclosed and
had to be caught in review.

---

## 3. Traps that cost real defects

Each of these produced a defect in phase 1. The mechanism is given because the
warning alone is not actionable.

### 3.1 The `base` token name collides with Tailwind's font-size step

This is the most expensive trap in the repository and it shipped a WCAG failure.

`--color-base` in `@theme` makes Tailwind v4 emit `.text-base` as a **colour**
utility, shadowing the built-in font-size utility of the same name — verified by
compiling the real token block: `text-base => .text-base { color:
var(--color-base) }`. Worse, `tailwind-merge` groups `text-base` with the
font-size family, so `cn()` treats it and `text-[1rem]` as the same slot and
silently drops whichever loses. The direction it drops depends on class order, so
the same bug appears as a missing colour or a missing font size.

Both directions shipped. First, `size: 'lg'`'s `text-base` applied no font size
at all, and `variant="link" size="lg"` rendered a `#070a12` label on the
`#070a12` page background — roughly 1:1, an invisible control. Then the fix
traded it for the opposite failure: `cn()` dropped the primary variant's
deliberate label colour, and the exported hero CTA in `out/index.html` rendered
`bg-accent hover:bg-brand h-13 px-8 text-[1rem]` with no colour class at all,
inheriting `--color-text` `#eef2f8` on `#527bff` — **3.32:1, failing AA's 4.5:1
for 16px text**. The same mechanism stripped `text-sm` from every primary button.

The resolution is in the repository now and must be preserved:

- `app/web/src/styles/globals.css:24` defines `--color-on-accent: #070a12` — the
  same value as `--color-base`, under a name that does not collide. Its comment
  says why.
- `app/web/src/components/ui/button.tsx:15` uses
  `'bg-accent text-on-accent hover:bg-brand'` for `variant.primary`. That dark
  label on the accent fill is the spec's measured 5.31:1 pair; it is a deliberate
  colour use, not a mistake to clean up.
- `app/web/src/components/ui/button.tsx:25` uses `'h-13 px-8 text-[1rem]'` for
  `size.lg` — an arbitrary value for a 1rem font size, with a comment saying why
  a named step cannot be used.
- `src/styles/tokens.test.ts` pins the `on-accent`/`accent` pair at 4.5:1, and
  the Button's colour and size assertions were moved onto a **rendered** element.

**The testing rule, and it generalises.** Assert colour and size on a rendered
element's `className`. `button.test.tsx` originally asserted on the raw `cva()`
string, which is produced _before_ `cn()` merges it — so the assertion could not
observe the strip, and it passed against the broken render. The merge is only
observable after it has happened.

Do not rename any colour token to fix a future collision of this shape. The names
are FINAL in the spec and pinned by `tokens.test.ts`; add a non-colliding alias
instead, as `--color-on-accent` did.

There is one latent instance left. Commit `7a52f19` switched `SkipLink` from
`text-base` to `text-on-accent`, which is correct today only because that literal
`className` carries no other font size and never passes through `cn()`.

### 3.2 `prettier-plugin-tailwindcss` throws on a missing stylesheet

`prettier-plugin-tailwindcss@0.8.1` resolves its `tailwindStylesheet` option
eagerly, for every JS/TS-parsed file, and throws
`ENOENT .../app/web/src/styles/globals.css` rather than degrading to "no
sorting". Ten files were affected and `format:check` exited 2. The plan's claim
that "the plugin tolerates this" is factually wrong.

`prettier.config.ts` already carries the `tailwindStylesheet` line and
`globals.css` already exists, so this is only a hazard if a later phase moves or
renames the stylesheet. If it does, move the config line in the same commit.

The reason it mattered at all: `pnpm format:check` runs inside both `pnpm verify`
and the pre-push hook, so leaving it broken breaks every push in the repository.

### 3.3 `serve out --single=false` enables SPA fallback

`serve` v14 treats `--single` as a boolean flag, and the string `"false"` is
truthy, so `--single=false` **enables** SPA fallback rather than disabling it.
Every route test was therefore asserting against the home page's `h1`, including
the one for `/404.html`. Non-SPA is already the default; the flag is simply gone
from `app/web/playwright.config.ts`, with a comment saying why it must not come
back.

### 3.4 `pnpm exec` orphans the web server

`pnpm exec` starts its child in a **new process group**. Playwright shuts a web
server down by SIGKILLing the process group of the command it spawned, so the
signal never reached `serve`: the orphan kept port 4321, Playwright waited for
the port to free, and `reuseExistingServer` silently adopted the orphan on the
next run. Proven with `DEBUG=pw:webserver` and `ps` process-group IDs — `sh` at
PGID 17003, `serve` at 17053.

The fix is to invoke the bin shim by path, which the config does:

```
command: '../../node_modules/.bin/serve out --listen ' + String(PORT),
```

The shim `exec`s node, so `serve` keeps the command's own pid and process group
and the group kill reaches it. Teardown went from minutes to 3ms and the suite
from 4.1 minutes to 35s. **Do not rewrite this back to `pnpm exec serve.`**

Worth knowing for diagnosis: Playwright folds teardown time into its reported
duration, which is why a 7.3-minute "test run" was almost entirely teardown, and
why `webServer.timeout` of 120s never fired. Three plausible-sounding hypotheses
— a localhost IPv6 stall, slow `serve` startup, `pnpm exec` overhead — were all
measured and all wrong (localhost 13.7ms vs 127.0.0.1 16.6ms; startup 422ms;
`pnpm exec` overhead ~200ms). Measure before theorising.

### 3.5 ESLint here is stricter than most plans assume

`eslint.config.ts` extends `tseslint.configs.strictTypeChecked` and
`stylisticTypeChecked` for `app/web/**/*.{ts,tsx}`, which turns on rules a plan's
literal code will usually violate. Verified with
`pnpm exec eslint --print-config app/web/src/lib/env.ts`:

- `@typescript-eslint/consistent-type-definitions` is on at its default — an
  `interface`, not a `type` alias, for an object type.
- `@typescript-eslint/dot-notation` is on — `t.border`, not `t['border']`.
- `@typescript-eslint/no-unused-vars` is on with **no options configured**, so
  there is no `argsIgnorePattern`: an unused parameter fails even when it is
  prefixed with an underscore.

Expect mechanical fixes to any literal code a plan specifies, and **disclose
every one.** Phase 1's undisclosed deviations were semantically inert, but the
omission was a false completeness claim in three task reports, and a reviewer had
to find them.

Two more config facts that cost a blocked task each. `tsconfigRootDir` must be an
absolute path — `join(import.meta.dirname, 'app/web')` — because typescript-eslint
does not resolve a relative one. And `eslint-config-next/core-web-vitals` is
imported as a native flat config array rather than bridged through
`@eslint/eslintrc`'s `FlatCompat.extends`, which crashes on circular JSON when
handed an already-flat export; the import does not carry the package's own global
ignore of `next-env.d.ts`, so `eslint.config.ts` replicates it.

That config also already registers the `jsx-a11y` plugin, so a second `plugins`
key for it throws "Cannot redefine plugin 'jsx-a11y'" — it is a different module
instance. The project block adds only `rules`. When phase 1 made that change, a
reviewer was required to prove empirically that the accessibility ruleset was
still live: a probe `<img>` with no alt produced `error jsx-a11y/alt-text`. Do
the same for any future change that touches plugin registration, because a
silently disabled ruleset looks exactly like a passing one.

---

## 4. Architectural rules that bit

### 4.1 Copy lives only in `src/content/`

This includes form field labels and validation messages. Phase 1's plan violated
its own rule — the Task 11 brief authored visitor-read copy inline in the contact
form — and commit `8df1e5a` had to relocate it. `app/web/src/content/ui.ts` now
holds the five field labels, the "not live yet" notice, the six validation
messages, the honeypot label and the optional marker.

Structural ARIA attributes stay inline in components. The dividing line is
whether a visitor reads the string.

### 4.2 Tokens only, no raw colour in a component

Colours live in `app/web/src/styles/globals.css` and nowhere else. The rule is
enforced, not merely stated: `eslint.config.ts` carries a
`no-restricted-syntax` selector matching `#rgb`, `rgb()`, `rgba()`, `hsl()`,
`hsla()` and `oklch()` literals across `app/web/src/**/*.tsx`, excluding
`src/styles/**`. Phase 1 proved the rule fires by writing a violation and
watching it exit 1.

The same config block restricts Motion imports to
`components/motion/**` and `components/effects/**`, forbids importing an effect
directly rather than through `next/dynamic`, and forbids `src/content/**`
importing any component. Phases 2 and 3 will meet all three.

---

## 5. Known gaps phase 2 and later inherit

### 5.1 The corpus revision gate is CLOSED

The spec's revision gate blocks phases 2 and 3 and reads
`<slug>/design-system.json`, `<slug>/extract.<viewport>.json`,
`<slug>/states/` and `<slug>/transitions/`. **None of those artefacts exist.**

`docs/ui-references/` holds ten numbered site directories (`01-david-hckh`
through `10-helloshivam`), plus `_recon/`, `_findings/`, `README.md` and
`STACK-COMPARISON.md` — 4,624 files in total. A `find` for `design-system.json`,
`extract.*.json`, `states` and `transitions` returns nothing.

So the corpus is substantial but it is not the corpus the gate reads. A tier-1
re-capture is required — at minimum `david-hckh`, `pacomepertant`, `topology-vc`
and `belenjones` — before `design-director` can run and before any provisional
visual value may be set. The spec is explicit: if the captures are absent, stop
and report; do not proceed on placeholder values, and do not invent measurements
and attribute them to the reference sites.

### 5.2 The `/work` countdown target has already passed

The owner-confirmed target is `2026-09-29T15:00:00-05:00` (Tuesday 29 September
2026, 15:00 America/Chicago). `/work` is built in phase 2, so **the expired state
is what ships.** The spec anticipated this and requires the page to render the
"in production" state — the same composition, countdown replaced by a statement
that case studies are coming, with the booking link as the action. It must never
display zeros, negative values or a frozen clock.

Phase 1's `/work` is a `PageHeader` skeleton with no countdown at all
(`app/web/src/app/work/page.tsx`), and `src/content/site.ts` does not yet carry
the target. Phase 2 adds it as a single ISO string there, so it is edited in one
place, and renders remaining time from it rather than from a hardcoded digit set.
The target must also be present as human-readable text in the exported HTML, with
the ticking digits as progressive enhancement, because the export has no
JavaScript until hydration.

### 5.3 Three invented bios await their subjects' corrections

`docs/content/team.md` carries `TODO(owner)` markers at lines 52, 75 and 96 for
Nate, Kirsten and Ashley respectively — "invented apart from the role. Nate to
correct or replace", and similarly for the other two. Marc's bio is from his own
facts. The owner is supplying real photographs of all four. Phase 2 consumes this
file; it must not resolve the markers by inventing better-sounding text.

The spec's non-negotiables require every invented factual claim to be flagged
both in its own file and in `CONTENT-TODO.md`, and phase 4's definition of done
is that `CONTENT-TODO.md` is empty. **That file does not exist yet**, so phase 2
creates it and seeds it with these three bios, the fabricated Blaine PO box, and
anything else it has to invent.

There are currently no `TODO(owner)` markers inside `app/web/src/content/`.

### 5.4 Form-field focus coverage is deferred

`app/web/tests/e2e/a11y.spec.ts:41` targets the first link in the header's
Primary navigation rather than the contact form's Name input, and the comment at
lines 34–40 records why: `/contact/` renders no form while
`NEXT_PUBLIC_CONTACT_ENDPOINT` is unprovisioned — `ContactForm` degrades to the
booking link plus a mailto, which `contact.spec.ts` asserts deliberately — so the
brief's locator targeted a fiction. A nav link exercises the same global
`:focus-visible` rule and is present in both shapes of the page, so the test will
not break when the endpoint lands.

Two alternatives were rejected for reasons that still apply: guarding on the
form's presence would make the test silently no-op in exactly the shipping
configuration, and an assertion that never runs is indistinguishable from a
passing one; building the fixture with an endpoint would make the result depend
on build-time env the commit cannot capture.

**Phase 2 owes the real form-field focus test**, once the endpoint exists.

### 5.5 The e2e suite proves the export, not production routing

`serve` resolves clean URLs and directory indexes that CloudFront over a plain S3
origin will not, until the rewrite function in the spec's CloudFront handoff
lands. `/404.html` passes only because `serve` 301s it to `/404`. The caveat is
written into `app/web/playwright.config.ts` beside the `webServer` block.

So the route assertions are necessary and not sufficient. No phase before 4 may
describe the site as "working" without qualifying it as "builds and passes
locally". Route resolution and HTTP 404 status are the two things that cannot be
proven locally at all, and phase 4 must verify them against a preview `ENV_ID`
environment before production, never straight to production.

### 5.6 Deferred minors, open on purpose

- `app/web/src/app/seo.test.ts:16` — the duplicate-URL case is **vacuous**.
  `sitemap()` deduplicates, but its input contains no duplicates either, so
  deleting the `Set` leaves the test green. Fix it by feeding it a duplicate.
- `app/web/src/lib/env.test.ts:13` — the `mutableEnv` cast
  (`process.env as Record<string, string | undefined>`) is broader than needed.
  Only `NODE_ENV` requires it, since Next's `global.d.ts` declares that field
  readonly; the cast also covers three `NEXT_PUBLIC_*` deletes that did not need
  it. No behaviour change, and `env.ts` itself carries no cast.
- Phase 1's Task 8 has **no TDD RED evidence**. Three session restarts destroyed
  it, and that is disclosed rather than reconstructed. The commit's assertions
  were independently re-run and the Button's guards were proven non-vacuous by
  reverting the token, so the code is covered; the process record is not.

---

## 6. How to generate the next plan

The generator is `superpowers:writing-plans`. Phase 1's plan came from it, and the
spec's **Implementation handoff** section names it for all four phases.

Its templates are **embedded in its own `SKILL.md`**, not in a standalone
template file. The installed skill directory
(`~/.claude/plugins/cache/superpowers-marketplace/superpowers/6.4.2/skills/writing-plans/`)
contains that single file and nothing else, and its headings are where each piece
of structure is defined: "Plan Document Header", "Global Constraints", "Review
Focus", "File Structure", "Task Structure", "What a Step Contains",
"Self-Review", "Execution Handoff". Phase 1's plan has exactly those sections, in
that order. Read the skill rather than copying phase 1's plan, because copying a
plan copies its wrong guesses too — which is what this document exists to stop.

**What the skill does not produce is the handoff wrapper.** Phase 1's
`PHASE_1_PROMPT.md` was composed by hand, refined three times in conversation,
and corrected afterwards against what execution found.
`docs/PHASE-PROMPT-TEMPLATE.md` now replaces that step: fill it in rather than
re-deriving the structure.

The spec's Implementation handoff section also lists which skill runs at which
stage. In order: `superpowers:writing-plans` for the phase 1 plan; `nextjs` and
`react-best-practices` consulted during phases 1–3; the corpus gate before phase
2; `design-director` before phase 2, producing the direction document that
updates the spec's PROVISIONAL sections; `media-planner` then `sourcing-media` in
phase 2; `superpowers:writing-plans` again for the phase 2 and 3 plans;
`impeccable` for phase 3 polish; and
`superpowers:requesting-code-review` before finishing each branch.

Media must not be sourced outside `media-planner` → `sourcing-media`.

---

## 7. Where the evidence lives

| Source                 | Path                                                                           | Tracked? |
| ---------------------- | ------------------------------------------------------------------------------ | -------- |
| Spec                   | `docs/superpowers/specs/2026-09-27-mccorlabs-website-design.md`                | no       |
| Phase 1 plan           | `docs/superpowers/plans/2026-09-27-mccorlabs-website-phase-1-foundation.md`    | no       |
| Execution ledger       | `.superpowers/sdd/2026-09-27-mccorlabs-website-phase-1-foundation/progress.md` | no       |
| Phase 1 handoff prompt | `PHASE_1_PROMPT.md`                                                            | yes      |
| Corpus spec            | `docs/superpowers/specs/2026-09-27-ui-reference-corpus-design.md`              | no       |

Phase 1 ran from baseline `4c2edd5` to `e534ced`. That range holds 24 commits, of
which two (`36f36ee`, `d4431d8`) belong to a concurrent session working on
`infra/` and the mail server. Thirteen tasks therefore produced twenty-one
commits, not thirteen: review fix rounds landed as their own commits whenever
amending would have rewritten a commit another session had already built on.
