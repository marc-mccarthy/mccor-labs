# Final fixes report — phase 1 review fix wave

Branch `feat/website-phase-1`, starting from HEAD `899d927`. Seven numbered items from
`/tmp/final-review.md`, one commit each.

## 1. Finding 1 — accessible hover fill for the primary CTA

`app/web/src/components/ui/button.tsx:15` was `primary: 'bg-accent text-on-accent hover:bg-brand'`.
`--color-on-accent` `#070a12` on `--color-brand` `#3d6bff` measures 4.4719:1, below the 4.5:1
that WCAG 1.4.3 requires for the button's 14px `text-sm` label.

Added `--color-accent-hover: #6d90ff` to the `@theme` block in
`app/web/src/styles/globals.css` and pointed the `primary` variant's hover at it. No existing
token value changed.

Arithmetic, by the WCAG 2.2 formula (0.04045 linearisation, 0.2126/0.7152/0.0722 coefficients,
`(L1 + 0.05) / (L2 + 0.05)`):

| Pair | Ratio | Verdict |
|---|---|---|
| `on-accent` `#070a12` on `accent-hover` `#6d90ff` | **6.6751:1** | passes AA with margin |
| `on-accent` `#070a12` on `accent` `#527bff` (rest) | 5.3110:1 | passes |
| `on-accent` `#070a12` on `brand` `#3d6bff` (old hover) | 4.4719:1 | failed |

The chosen value stays in the accent's blue family: its hue is 225.6 degrees against the
accent's 225.8 degrees, computed from the RGB triples. It is visibly lighter than the rest
state — a relative luminance ratio of 1.2569 between the two fills — so hover still reads as
a state change.

Regression guards added to `app/web/src/styles/tokens.test.ts`: the pair
`['on-accent', 'accent-hover', 4.5, ...]`, and `accent-hover` in the list of tokens that must
exist. The pair `['on-accent', 'accent', 4.5, ...]` was already present at line 43.

Verification: `vitest run` 9 files / 65 tests passed (one more than the previous 64, the new
pair), `pnpm -F web lint` exit 0, Prettier clean on all three files.

Commit `90a7210`.

## 2. Finding 3 — commit the tsconfig form that `next build` produces

`pnpm build` rewrites `app/web/tsconfig.json` (`jsx: "preserve"` becomes `"react-jsx"`,
`.next/dev/types/**/*.ts` is appended to `include`, and every array is expanded to one entry per
line) and appends two imports to `app/web/next-env.d.ts`. Commit `2c8241f` had silenced
`format:check` on both; the rewrite itself still happened on every build, and `pnpm build` runs
on pre-push.

Committed both files in the form the build produces, so the rewrite is now a no-op.

Before committing, I checked the case the change could break: a fresh clone with no `.next/`
directory, where `next-env.d.ts`'s new `import "./.next/types/routes.d.ts"` has nothing to
resolve to. Probe — move `app/web/.next` and `app/web/tsconfig.tsbuildinfo` aside, run
`pnpm -F web exec tsc --noEmit` cold, restore both:

```
TSC_EXIT=0   (no output)
```

So the committed form typechecks with and without build output.

Verification after the commit: `pnpm build` exit 0, `git status --short` shows neither
`app/web/tsconfig.json` nor `app/web/next-env.d.ts`, and `pnpm -F web exec tsc --noEmit` exits 0
under the newly committed config.

Commit `1ae89eb`.

## 3. Finding 7 — the no-endpoint contact assertion is now unconditional

`app/web/tests/e2e/contact.spec.ts:13-20` wrapped its only assertion in
`if ((await submit.count()) === 0)`. A wrongly rendered submit button made the condition false,
no assertion ran, and the test reported green — the shape the ledger rejected for
`a11y.spec.ts`.

Replaced the guard with two unconditional assertions, `await expect(submit).toHaveCount(0)` and
`await expect(mailto.first()).toBeVisible()`, and a comment recording why they are safe to run
unconditionally: the fixture is built with no `NEXT_PUBLIC_CONTACT_ENDPOINT`. Name and intent
unchanged.

Commit `57401cc`.

## 4. Finding 8 — both booking CTA branches covered independently

`app/web/src/components/layout/layout.test.tsx:22-32` imported `env` at module scope and branched
on `env.bookingUrl === null`. Under `NODE_ENV=test` with no `NEXT_PUBLIC_BOOKING_URL` that is
always `null`, so the `else` branch — the one that actually ships, carrying
`target="_blank" rel="noopener noreferrer"` — never ran and the anti-tabnabbing assertion was
dead.

Replaced the single branching test with two independent cases over a `vi.mock('@/lib/env', …)`
whose object is created by `vi.hoisted` so the mock factory can see it. A `beforeEach` resets
`bookingUrl` to `null`, and each case sets what it needs:

- "falls back to an email link when booking is not configured" — `bookingUrl: null`, asserts the
  `mailto:` href.
- "links to the booking url in a new tab when booking is configured" — a configured URL, asserts
  `href`, `target="_blank"`, and `rel` containing both `noopener` and `noreferrer`.

No `if`/`else` remains, so neither case can silently not run. The booking case queries by
`ui.bookCall`, which only the configured branch renders, so its passing is itself evidence that
the branch executed.

Verification: `vitest run` 9 files / 66 tests passed, `pnpm -F web lint` exit 0,
`tsc --noEmit` exit 0.

Commit `ea780cc`.

### Caveat on item 2 found later

While probing the lint rules for item 5, `app/web/next-env.d.ts` turned up modified again, but to
a different form than before — `./.next/dev/types/...` instead of the committed
`./.next/types/...`:

```diff
-import "./.next/types/routes.d.ts";
+import "./.next/dev/types/routes.d.ts";
```

I could not reproduce it: after restoring the file, `pnpm -F web lint` left the tree clean,
`pnpm -F web exec eslint` on an existing file left it clean, and the same on a newly created file
left it clean. `ps` shows a `next dev` server running in this repository (PID 51787, `next-server
v16.3.6`), started by another session; it is a plausible writer of the dev-path form, but I did
not isolate the cause and so do not claim it. What is measured: with the build form committed,
`pnpm build` leaves both files unmodified, and so does `pnpm -F web lint`.

## 5. Findings 5 and 6 — ESLint rule gaps closed, plus a text-base guard

`eslint.config.ts`. Four changes:

1. The colour rule gains a `TemplateElement[value.raw=/…/]` selector. A `TemplateLiteral`'s parts
   are `TemplateElement` nodes whose `value` is an object, so the existing `Literal[value=/…/]`
   selector could never see a hex or `rgb()` written inside backticks.
2. The colour rule's glob widens from `app/web/src/**/*.tsx` to `app/web/src/**/*.{ts,tsx}`,
   keeping the `app/web/src/styles/**` exclusion. `src/content/` and `src/lib/` are `.ts`, and
   `src/content/` is where phase 2 puts data that can carry colour values.
3. The lazy-effects import group gains `**/components/effects/**` and the relative forms
   `./effects/*`, `./effects/**`, `../effects/*`, `../effects/**`, `../../effects/*`,
   `../../effects/**`. Relative sibling imports are already a house convention — `Header.tsx`
   imports `./BookingCta` and `./Container` that way — so the relative form was the likely one to
   be written.
4. A new `text-base` guard, as `Literal` and `TemplateElement` selectors, scoped to
   `app/web/src/**/*.tsx`.

`no-restricted-syntax` does not merge across flat-config blocks — the last matching block replaces
the whole option array — so the colour selectors are declared once as a shared const and restated
in the `.tsx` block that also carries the `text-base` selectors. Without that, adding the
`text-base` block would have silently removed the colour rule from every `.tsx` file.

Probe: six files written under `app/web/src/`, linted, then deleted in the same command.

| Probe | File | Result |
|---|---|---|
| A | `` const c = `#ff0000` `` and `` `linear-gradient(rgb(1, 2, 3), transparent)` `` in `.tsx` | **error**, both lines, template-literal message |
| B | `export const brandHex = '#ff0000'` in `src/content/__probeB.ts` | **error** |
| C | `export const libHex = '#ff0000'` in `src/lib/__probeC.ts` | **error** |
| D | `import * as Fx from '../effects/Fx'` in `src/components/sections/__probeD.tsx` | **error**, `no-restricted-imports` |
| E | `className="text-base font-medium"` in `.tsx` | **error**, text-base message |
| F | `style={{ color: '#ff0000' }}` in `.tsx` (control, previously caught) | **error**, still caught |

All six were previously silent except F. `git status --short` after deleting the probes matched the
baseline.

`PATH=/opt/homebrew/bin:$PATH pnpm -F web lint` exits 0 on the existing code under all four rules,
so no current file trips the widened globs or the new guard. The three `text-base` occurrences in
the source are all in comments, which are not AST `Literal` nodes.

Not changed: Finding 5d, the Motion rule's missing `motion/mini`, `motion/react-client` and
`framer-motion` entry points. It was not in the fix wave's scope.

Commit `fdc96ce`.

## 6. Finding 11's missing glow pair

`app/web/src/styles/tokens.test.ts`. The reviewer measured `--color-text` `#eef2f8` on
`--color-glow-violet` `#7c5cff` at 3.8684:1, which fails AA for text at any size. I recomputed it
with the same formula and got the same figure, and `--color-text` on `--color-glow-cyan` `#22d3ee`
at 1.6085:1.

A threshold assertion cannot express "text must not sit on the glow": asserting the ratio stays
*below* 4.5 would fail if someone legitimately darkened a glow, which is not a regression. So the
constraint is recorded as the spec states it — the spec, line 553-555, says the gradient glow "is a
_light source_ behind content. It never sits under text and never carries meaning" — in a comment
carrying both measured figures, and the pairs that *are* asserted are the ones the glow is
legitimately judged on: each glow against `base` at WCAG 1.4.11's 3:1 for a non-text graphic
(`glow-violet` 4.5533:1, `glow-cyan` 10.9503:1). Both glows were also added to the list of tokens
that must exist, which nothing covered before.

Verification: `vitest run src/styles/tokens.test.ts` 18 tests passed.

Commit `be393a5`.

## 7. Findings 9, 20, 21.1 and 22 — four stale or broken references

**Finding 9.** `package.json`'s `capture` script pointed at `scripts/capture-reference-site.mjs`.
`ls scripts/` lists `capture-ui-references.mjs`, `lib`, `recon-reference-sites.mjs` and
`verify-site-selectors.mjs` — no such file as the one the script named. Repointed at
`scripts/capture-ui-references.mjs`, which `node --check` parses cleanly. I did not execute it,
since it drives a browser against live sites.

**Finding 20.** The `"//"` comment justified the exact Playwright pin with "a volume at 89%
capacity", which measurement had falsified. Rewrote it to the reason that is actually true — the
exact pin matches the browser revision installed in `~/Library/Caches/ms-playwright`, and a caret
range floats to a version wanting a different revision, after which the suite cannot launch a
browser until someone downloads one. `ls ~/Library/Caches/ms-playwright/` now shows
`chromium-1228` present, alongside `chromium-1223`, `chromium-1247` and three Firefox revisions.
The pin and the warning against widening it are kept.

**Finding 21.1.** Added a paragraph to `README.md` after the requirements line recording that pnpm
12.6.0 comes from Homebrew, that `/opt/homebrew/bin` must come first on `PATH`, and that a plain
`pnpm` here is a self-installing shim which tries to fetch `pnpm@12.6.0` from npm where that
version does not exist — so commands and git hooks die silently rather than reporting an error.

**Finding 22.** Rewrote the "Note on tracking" in `docs/website-design/PHASE-1-CARRY-FORWARD.md`.
Measured the current state rather than taking the review's word: `.gitignore:27-28` narrows the
ignore to `infra/**/superpowers/` and `infra/**/.superpowers/`; `git ls-files docs/superpowers/`
returns 8 files; `git ls-files .superpowers/` returns 88; `git check-ignore -v` on the spec exits 1,
meaning it is not ignored. The note now says a `git clean` no longer destroys the phase 2 plan, and
keeps the one part that is still true — `**/ui-references/` is still ignored, so the captured
reference corpus still needs backing up outside git.

Two notes on that file for the owner:

1. It is edited at its new `docs/website-design/` path, as instructed, which means this commit adds
   that path to the index while the deletion of the old `docs/PHASE-1-CARRY-FORWARD.md` stays
   unstaged in the other session's working tree. Until that session commits its deletions, both
   paths are tracked.
2. The same note's closing sentence previously said "This document and the prompt template live
   directly under `docs/`". They no longer do — the other session moved them. I left the location
   claim out of the rewrite rather than restating it, since the directory layout is that session's
   in-flight work, not mine to assert.

Commit `fa0de45`.

---

## End-state verification

| Check | Result |
|---|---|
| `pnpm -F web exec vitest run` | **9 files, 68 tests, all passed** (1.15s). Was 9 files / 64 tests; the four added are the `on-accent`/`accent-hover` pair, the two glow pairs, and the split of the booking CTA test into two cases. |
| `pnpm -F web lint` | **exit 0** |
| `pnpm -F web exec tsc --noEmit` | **exit 0** |
| `pnpm -F web test:e2e` | **28 passed** on Firefox headless (7.9s), matching the recorded figure |

`git status --short` shows only the other session's `infra/` modifications and its documentation
reorganisation, plus the one `docs/website-design/` file this wave had to edit.

## What I could not do, and one thing to know

**`pnpm build` through `op run` no longer completes.** It failed with
`NEXT_PUBLIC_BOOKING_URL is required for a production build`. The cause is not the branch: while
this fix wave was running, another session committed `4c78266`, "chore: replace a real booking URL
with a placeholder", and the 1Password item's `booking_url` field is now empty —
`op read op://Development/mccorlabs/booking_url` returns an empty string, and
`op item get mccorlabs --format json` shows the field's value as null, while `site_url` still reads
`https://mccorlabs.com`. `op whoami` succeeds as a service account, so this is the item's content,
not an auth failure.

That failing build also deleted `app/web/out/`, which the e2e suite serves. To get a real e2e
result I rebuilt through `pnpm build:raw` with the two public values supplied on the command line.
The first such rebuild used the real calendar URL, since I did not yet know it had just been
scrubbed; on finding commit `4c78266` I immediately rebuilt with
`NEXT_PUBLIC_BOOKING_URL=https://calendar.app.google/EXAMPLE` and re-ran the suite, which passed
28/28 again. The real value is now absent from the whole working tree and from `app/web/out/`:
`grep -rl` over the tree returns 0 hits and `git grep` at HEAD returns 0.

It does survive in three files under `app/web/.next/dev/`, which belong to a `next dev` server
another session is running (PID 51787) and which predate the scrub. `.next/` is gitignored, so
nothing reaches history, but that server's cache should be cleared when it is next stopped — I did
not touch it, since deleting a live dev server's cache is not mine to do.

**Someone needs to repopulate `booking_url` in the `mccorlabs` item** before the next
`pnpm build`, or every build through `op run` will keep failing this way. I did not write to the
vault.

**Finding 5d is untouched** — the Motion rule still lists only `motion` and `motion/react`, not
`motion/mini`, `motion/react-client` or `framer-motion`. It was outside this wave's scope.

## Update: the vault was restored, and the build was re-verified through `op run`

The owner restored `booking_url` in the `mccorlabs` item (now version 4). With that in place the
build and the e2e suite were re-run the normal way, replacing the `build:raw` workaround described
above:

| Check | Result |
|---|---|
| `pnpm build` (through `op run`) | **exit 0** |
| `git status --short app/web/` immediately after that build | **empty** — item 2's fix holds, neither `tsconfig.json` nor `next-env.d.ts` is dirtied |
| `pnpm -F web test:e2e` against the `op`-built export | **28 passed** on Firefox headless (15.7s) |

So the earlier `NEXT_PUBLIC_BOOKING_URL is required for a production build` failure was the cleared
vault field, not anything on this branch. `src/lib/env.ts` was not touched and needs no fallback —
failing when the value is absent is the spec's intended behaviour.

`app/web/src/lib/env.test.ts` was changed by commit `4c78266`, not by this wave. Nothing here edits
it, and the suite passes against its current contents.
