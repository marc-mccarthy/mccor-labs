# Task 6 Report: Tailwind v4 and the design tokens, with contrast measured in a test

## Status: DONE

## What I implemented

- Installed `tailwindcss@4.3.3` and `@tailwindcss/postcss@4.3.3` (exact, per ruling 4) plus `clsx` and `tailwind-merge` into `app/web`.
- Created `app/web/postcss.config.mjs` exactly as the brief specifies.
- Wrote `app/web/src/styles/tokens.test.ts` verbatim from the brief (Step 3), with one lint-driven tweak — see "Deviation from brief" below.
- Replaced the contents of the pre-existing `app/web/src/styles/globals.css` stub (from Task 3) with the brief's full stylesheet: nine colour tokens, two glow tokens, `@layer base` block, and the `prefers-reduced-motion` block.
- Created `app/web/src/lib/cn.ts` with the `cn()` helper.

## TDD evidence

**RED** — `PATH=/opt/homebrew/bin:$PATH pnpm -F web exec vitest run src/styles/tokens.test.ts`, run against the Task-3 stub (comment-only, no `--color-*` declarations):

```
 FAIL  src/styles/tokens.test.ts > design tokens > defines every token the components rely on
TypeError: .toMatch() expects to receive a string, but got undefined
 ❯ src/styles/tokens.test.ts:63:70
...
 Test Files  1 failed (1)
      Tests  14 failed (14)
```

Expected per ruling 3: the stub file already exists, so the failure is "no tokens parsed" (`tokens()` returns `{}`, every lookup is `undefined`) rather than ENOENT — same net effect, ratios can't be computed, so the RED step still holds.

**GREEN** — same command, after Step 5 replaced `globals.css`:

```
 RUN  v5.0.2 /Users/mj/repos/mccor-labs/app/web

 Test Files  1 passed (1)
      Tests  14 passed (14)
   Duration  547ms
```

All 12 contrast pairs (`it.each(PAIRS)`) plus both structural assertions (token presence, decorative-border-stays-decorative) passed.

## Resolved versions

- `tailwindcss`: `4.3.3` (exact, as pinned)
- `@tailwindcss/postcss`: `4.3.3` (exact, as pinned)
- `clsx`: `2.1.1` (`^2.1.1` in package.json)
- `tailwind-merge`: `3.7.0` (`^3.7.0` in package.json)

## Prettier / Tailwind loading

Once `globals.css` held real Tailwind content, `prettier-plugin-tailwindcss` loaded it for real for the first time. `pnpm format:check` (workspace root) flagged two files:

- `app/web/src/styles/tokens.test.ts` — genuine formatting issue (one line exceeded the 90-char `printWidth`; the brief's snippet wasn't pre-formatted to this repo's Prettier config). Ran `prettier --write` on this file only; the diff was a pure line-wrap of the `expect(...).toMatch(...)` call, no semantic change. Verified tests still passed after.
- `eslint.config.ts` (repo root) — pre-existing, already committed in `f000549`, not a file I touched or that Task 6 owns. Left untouched; not in scope.

No unexpected Tailwind-load errors or reformatting beyond that one line-wrap.

## Deviation from brief

The pre-commit hook's lint step failed on the first commit attempt:

```
app/web/src/styles/tokens.test.ts
  69:65  error  '_label' is defined but never used  @typescript-eslint/no-unused-vars
```

The repo's `eslint.config.ts` has no `argsIgnorePattern` exemption for underscore-prefixed unused args, so the brief's verbatim `(fg, bg, required, _label) => {` callback parameter fails lint. `vitest`'s `it.each` substitutes the `%s` placeholders in the test-name template from the `PAIRS` array items directly (not from the callback's parameter names), so the test names are unaffected by removing the parameter. I removed the unused `_label` parameter — `(fg, bg, required) => {` — re-ran the test (still 14/14 passing) and lint (clean), then committed. This is not a token-value or ratio change; it does not touch `eslint.config.ts` (out of scope, belongs to Task 4) and does not change test semantics.

## Files changed (single commit `5d19243`)

- `app/web/package.json` (M)
- `app/web/postcss.config.mjs` (A)
- `app/web/src/lib/cn.ts` (A)
- `app/web/src/styles/globals.css` (M)
- `app/web/src/styles/tokens.test.ts` (A)
- `pnpm-lock.yaml` (M)

`git status --short` before staging confirmed nothing under `infra/` was touched. Staged only the six files above, no `git add -A`.

## Self-review findings

- All nine base tokens (`base`, `surface`, `elevated`, `border`, `border-strong`, `muted`, `text`, `brand`, `accent`) present with the brief's exact hex values.
- Both glow tokens (`glow-violet: #7c5cff`, `glow-cyan: #22d3ee`) present.
- `@layer base` block present (universal `min-width: 0`, `html` text-size-adjust, `body` background/color/antialiasing, `:focus-visible` outline).
- `prefers-reduced-motion: reduce` block present, targeting animation/transition duration and scroll-behavior.
- No colour literal (hex/rgb/hsl/oklch) outside `globals.css` in any file I created — `cn.ts` and `tokens.test.ts` contain none; `postcss.config.mjs` contains none.
- No token value was altered to make a ratio pass — all nine values are exactly as given in the brief.

## Concerns

None blocking. Two minor, both explained above and neither require further action from me:
1. The one-line Prettier wrap in `tokens.test.ts` (cosmetic only).
2. The `_label` parameter removal (lint-driven, no semantic change, documented above for visibility).

## Fix round 1: format `eslint.config.ts`

Team lead found that the unformatted `eslint.config.ts` (Task 4, committed before Task 5's hooks existed, so Prettier never ran on it) failed `pnpm format:check`, which is a step in both `pnpm verify` and the pre-push hook — blocking the gate for every task, not just mine.

**1. Reformat:**

```
$ PATH=/opt/homebrew/bin:$PATH pnpm prettier --write eslint.config.ts
eslint.config.ts 68ms
```

**2. Diff review — confirmed formatting-only:**

```diff
@@ -29,7 +29,10 @@
   {
     files: ['app/web/**/*.{ts,tsx}'],
-    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
+    extends: [
+      ...tseslint.configs.strictTypeChecked,
+      ...tseslint.configs.stylisticTypeChecked,
+    ],
@@ -56,8 +59,7 @@
       'no-restricted-syntax': [
         'error',
         {
-          selector:
-            'Literal[value=/#[0-9a-fA-F]{3,8}\\b|rgba?\\(|hsla?\\(|oklch\\(/]',
+          selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b|rgba?\\(|hsla?\\(|oklch\\(/]',
           message:
             'No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css.',
         },
@@ -67,10 +69,7 @@
   {
     files: ['app/web/src/**/*.{ts,tsx}'],
-    ignores: [
-      'app/web/src/components/motion/**',
-      'app/web/src/components/effects/**',
-    ],
+    ignores: ['app/web/src/components/motion/**', 'app/web/src/components/effects/**'],
```

All four hunks are pure line-wrap/join changes — the `extends` array elements, the `no-restricted-syntax` selector regex string (byte-for-byte identical, just unwrapped to one line), and the `ignores` glob array (same two globs, joined to one line) are unchanged in content and order. No rule value, selector, `files`/`ignores` pattern, or config-array element was added, removed, or reordered. Confirmed `prettierConfig` (aliased from `eslint-config-prettier/flat`) is still the last element in the exported `tseslint.config(...)` array — verified by reading the file's final lines: `// Must be last so formatting rules do not fight Prettier.\n  prettierConfig,\n)`.

**3. `format:check` now exits 0:**

```
$ PATH=/opt/homebrew/bin:$PATH pnpm format:check
$ prettier --check .
Checking formatting...
All matched files use Prettier code style!
```

**4. `pnpm -F web lint` still exits 0:**

```
$ PATH=/opt/homebrew/bin:$PATH pnpm -F web lint
$ eslint .
Pages directory cannot be found at /Users/mj/repos/mccor-labs/app/web/pages or /Users/mj/repos/mccor-labs/app/web/src/pages. If using a custom path, please configure with the `no-html-link-for-pages` rule in your eslint config file.
exit:0
```
(The "Pages directory" line is an informational warning from `eslint-plugin-react` given this is a src-only Next.js layout with no pages yet — not an error; exit code is 0.)

**5. Commit** (separate from Task 6's commit, staged `eslint.config.ts` only, no `git add -A`):

```
18f67e7 style(web): format eslint.config.ts
 1 file changed, 6 insertions(+), 7 deletions(-)
```

Confirmed semantically inert: this was a pure Prettier reformat of Task 4's file, no rule or config-array-ordering change.
