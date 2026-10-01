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
