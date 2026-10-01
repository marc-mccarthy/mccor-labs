# Task 4 Report: ESLint flat config at the repository root

**Status: DONE** (initially reported BLOCKED; unblocked by team-lead ruling — see "Resolution" below)

## Resolution (after initial BLOCKED report)

Team-lead ruled: `eslint-config-next@16.3.6` is an exact pin locked to the inviolable `next@16.3.6`,
while `eslint@^10` was only the plan author's caret guess — the pin wins. Directed to install
`eslint@^9` (newest patch), keep both Step-2 deviations already made (native flat import, absolute
`tsconfigRootDir`, replicated `next-env.d.ts` ignore), drop the now-unused `@eslint/eslintrc`
dependency, and re-verify from the top.

Ran `PATH=/opt/homebrew/bin:$PATH pnpm add -D -w eslint@^9` → resolved `eslint@9.39.5`. Ran
`pnpm remove -w @eslint/eslintrc` → removed cleanly (it was never re-added after Step 3, and had no
other consumer).

Re-running `pnpm -F web lint` under `eslint@9.39.5` surfaced one more real, distinct error (not
previously reachable under ESLint 10, since that crashed earlier on `eslint-plugin-react`):

```
ConfigError: Config (unnamed): Key "plugins": Cannot redefine plugin "jsx-a11y".
    at rethrowConfigError (@eslint/config-array/dist/cjs/index.cjs:343:8)
    at FlatConfigArray.getConfig (@eslint/config-array/dist/cjs/index.cjs:1427:15)
```

Root cause: `eslint-config-next/core-web-vitals`'s own `next` config block already registers the
`jsx-a11y` plugin for `files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}']` (confirmed by reading
`eslint-config-next/dist/index.js`, which `core-web-vitals.js` re-exports and extends). The brief's
Step 2 config separately declared `plugins: { 'jsx-a11y': jsxA11y }` for `app/web/**/*.tsx`, using a
different import of the same npm package — a different module instance, which ESLint's flat config
merger treats as a genuine redefinition conflict on overlapping files, and refuses.

**Fix applied:** removed the duplicate `plugins` key from that block; kept only
`rules: { ...jsxA11y.flatConfigs.recommended.rules }`, since the plugin is already registered by
`next/core-web-vitals` for the same files. This is additive-only (it still adds the fuller
`jsx-a11y` recommended ruleset that `next/core-web-vitals` does not fully include on its own) and
does not touch any of the four project-specific rules.

## Original blocker report (superseded, kept for the record)

## What was implemented before the blocker

- Step 1: Installed `eslint@10.11.0`, `typescript-eslint@8.70.1`, `eslint-config-next@16.3.6`,
  `eslint-plugin-jsx-a11y@6.10.2`, `eslint-config-prettier@10.1.8`, `jiti@2.7.0` at the workspace
  root via `PATH=/opt/homebrew/bin:$PATH pnpm add -D -w …`. All resolved at the exact/caret
  versions the brief specified — no substitutions needed.
- Step 2: Created `eslint.config.ts` per the brief, with two forced deviations discovered during
  verification (see below).
- Step 3: Installed `@eslint/eslintrc@3.3.7`. (Note: after the Step 2 deviation, this package is no
  longer imported by the config — see "Unused dependency" below.)
- Step 4: **Failed after three iterations, the last of which is an unresolvable upstream
  incompatibility.**

## Step 2 deviations (forced by real errors, not stylistic choices)

### Deviation A: `compat.extends('next/core-web-vitals')` crashes

Running `pnpm -F web lint` with the brief's config exactly as written crashed with:

```
TypeError: Converting circular structure to JSON
    --> starting at object with constructor 'Object'
    |     property 'configs' -> object with constructor 'Object'
    |     property 'flat' -> object with constructor 'Object'
    |     ...
    |     property 'plugins' -> object with constructor 'Object'
    --- property 'react' closes the circle
    at ConfigValidator.formatErrors (@eslint/eslintrc/lib/shared/config-validator.js:299:23)
    ...
    at FlatCompat.extends (@eslint/eslintrc/lib/flat-compat.js:312:21)
    at eslint.config.ts:23:20
```

Root cause: `eslint-config-next@16.3.6` no longer ships a legacy eslintrc-style shareable config.
Its `package.json` exports map includes a native-flat subpath:

```json
"./core-web-vitals": { "types": "./dist/core-web-vitals.d.ts", "default": "./dist/core-web-vitals.js" }
```

and `dist/core-web-vitals.d.ts` declares `declare const config: Linter.Config[]` — i.e. it is
already a flat config array. `FlatCompat.extends()` expects a legacy eslintrc name/object and, when
handed this already-flat structure, `@eslint/eslintrc`'s validator throws while trying to
`JSON.stringify` an object containing a circular reference (the react plugin's own `configs` tree)
in order to format a validation error message.

**Fix applied:** import the flat config directly instead of bridging it through `FlatCompat`:

```ts
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
...
...nextCoreWebVitals,
```

This removed the only use of `@eslint/eslintrc` in the file (see "Unused dependency" below), and
made `FlatCompat`/`dirname`/`fileURLToPath` imports dead, so those were removed too.

After this fix, five files failed to parse:

```
app/web/next-env.d.ts        - Parsing error: parserOptions.tsconfigRootDir must be an absolute path, but received: "app/web"
app/web/next.config.ts       - same
app/web/src/test/setup.ts    - same
app/web/tests/workspace.test.ts - same
app/web/vitest.config.ts     - same
```

This confirms the brief's own flagged risk (its point 3): the relative `tsconfigRootDir: 'app/web'`
does not resolve. Fixed per the brief's own fallback instruction, using `import.meta.dirname`:

```ts
tsconfigRootDir: join(import.meta.dirname, 'app/web'),
```

`import.meta.dirname` resolves to the repo root (where `eslint.config.ts` lives), so
`join(import.meta.dirname, 'app/web')` = `/Users/mj/repos/mccor-labs/app/web` — the same directory
the relative form was meant to reach. Used the derived-absolute-path form, as instructed, since the
relative form failed to resolve.

Re-running after this fix still failed, now with `next-env.d.ts` (a Next-generated file) being
linted directly, throwing a `Parsing error` from `@typescript-eslint`. `eslint-config-next`'s full
`index.js` export carries a global `ignores` block for `next-env.d.ts`/`.next/**`/`out/**`/`build/**`,
but the `/core-web-vitals` subpath (used here per the brief's intent of only pulling in
`next/core-web-vitals`, not the full recommended set) does not carry that ignore. Added
`'app/web/next-env.d.ts'` to this config's own top-level `ignores` array to replicate it. This
cleared that error.

### Deviation B (unresolved): `eslint-plugin-react@7.37.5` is incompatible with `eslint@10`

With both fixes above in place, `pnpm -F web lint` now fails on *every* file (not project-rule
related) with:

```
TypeError: Error while loading rule 'react/display-name': contextOrFilename.getFilename is not a function
    at resolveBasedir (eslint-plugin-react/lib/util/version.js:31:100)
    at detectReactVersion (eslint-plugin-react/lib/util/version.js:85:19)
    at getReactVersionFromContext (eslint-plugin-react/lib/util/version.js:116:25)
    at testReactVersion (eslint-plugin-react/lib/util/version.js:181:28)
    at usedPropTypesInstructions (eslint-plugin-react/lib/util/usedPropTypes.js:307:36)
    at Components.componentRule (eslint-plugin-react/lib/util/Components.js:940:37)
```

Investigated the root cause directly rather than guessing:

- `eslint-plugin-react@7.37.5` (the latest published version, and the one `eslint-config-next`
  resolves via its `"eslint-plugin-react": "^7.37.0"` dependency) declares
  `"peerDependencies": { "eslint": "^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7" }` — it does **not**
  declare support for ESLint 10, confirmed via `npm view eslint-plugin-react@latest peerDependencies`.
- Its `resolveBasedir()` helper (used by 10 different rules, not just `react/display-name`) calls
  `contextOrFilename.getFilename()`. Checked `eslint@10.11.0`'s linter source directly
  (`grep -rn getFilename node_modules/.../eslint/lib/linter/*.js`) — there is **no `getFilename`
  method anywhere in ESLint 10's rule context implementation.** It was fully removed, not merely
  deprecated as it was in ESLint 9.
- Because 10 separate rule files in `eslint-plugin-react` call this version-detection path
  (`grep -rl getReactVersionFromContext lib/rules | wc -l` → 10), this cannot be worked around by
  disabling a single rule like `react/display-name` — the same crash recurs on the next rule that
  needs the React version (`react/prop-types`, `react/jsx-uses-react`, etc., all of which are part
  of `eslint-config-next`'s `configs.recommended.rules` spread).
- There is no newer `eslint-plugin-react` release to upgrade to (7.37.5 is latest on npm as of this
  check) and no ESLint-10-compatible version exists yet upstream.

This is a genuine version incompatibility between two of the brief's own pins:
`eslint@^10` (resolved 10.11.0) and `eslint-config-next@16.3.6` (exact, tied to `next@16.3.6`,
transitively requiring `eslint-plugin-react@^7.37.0`, whose only available release does not support
ESLint 10 at runtime). It is not an install failure — everything installs cleanly — it is a runtime
crash on every single file linted, unrelated to and upstream of the four project rules this task
exists to add.

I did not attempt: downgrading `eslint` to `^9` (violates the brief's explicit `eslint@^10` pin and
plan-author's version policy), patching `node_modules` directly (not a durable fix, would not
survive a fresh install), or hand-rolling a replacement for `eslint-config-next` that drops
`eslint-plugin-react` (this would mean not actually using `next/core-web-vitals` at all, a much
larger deviation than anything pre-authorized).

## Why I am stopping here

Per instructions: "STOP and report rather than improvising if: a verification step fails twice... or
`eslint-config-next@16.3.6` will not install." Step 4 has now failed three times for three different
root causes; the first two were fixable within the brief's own stated fallback guidance (native flat
import, absolute `tsconfigRootDir`, replicated ignore), but the third is an unresolvable upstream
peer-dependency gap between `eslint@^10` and the only available `eslint-plugin-react` release that
`eslint-config-next@16.3.6` depends on. I have not touched Steps 5, 6, or 7 (no probe written, no
commit made).

## Unused dependency

`@eslint/eslintrc@3.3.7` (Step 3) is installed but, after Deviation A, no longer imported anywhere in
`eslint.config.ts`. I left it installed rather than uninstalling it, since removing a dependency the
brief explicitly asked for felt like a decision for the requester, not something to do unilaterally
while already blocked. Flagging it as a question rather than a decision.

## Current repo state

```
$ git status --short
 M package.json
 M pnpm-lock.yaml
?? eslint.config.ts
```

Nothing under `infra/` touched. No probe file or empty directory created (Steps 5/6 never reached).
No commit made.

## Files changed so far (uncommitted)

- `package.json` — root `devDependencies` gained `eslint`, `typescript-eslint`,
  `eslint-config-next`, `eslint-plugin-jsx-a11y`, `eslint-config-prettier`, `jiti`,
  `@eslint/eslintrc`.
- `pnpm-lock.yaml` — updated accordingly.
- `eslint.config.ts` — new file, per the brief with the two forced deviations described above.

These questions were resolved by the team-lead ruling above (eslint@^9, drop @eslint/eslintrc).

## Final verification (all real commands, actual output)

**Step 4** — `pnpm -F web lint`, clean tree:

```
$ eslint .
Pages directory cannot be found at /Users/mj/repos/mccor-labs/app/web/pages or /Users/mj/repos/mccor-labs/app/web/src/pages. If using a custom path, please configure with the `no-html-link-for-pages` rule in your eslint config file.
exit=0
```

(The "Pages directory cannot be found" line is `@next/eslint-plugin-next`'s informational output
for an App Router project with no `pages/` directory — not an error. Exit code is 0.)

**Step 5** — probe written to `app/web/src/components/layout/__ruleprobe.tsx`
(`mkdir -p app/web/src/components/layout` then the brief's exact heredoc content), then
`pnpm -F web lint; echo "exit=$?"`:

```
$ eslint .
Pages directory cannot be found at /Users/mj/repos/mccor-labs/app/web/pages or /Users/mj/repos/mccor-labs/app/web/src/pages. If using a custom path, please configure with the `no-html-link-for-pages` rule in your eslint config file.

/Users/mj/repos/mccor-labs/app/web/src/components/layout/__ruleprobe.tsx
  2:31  error  No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css  no-restricted-syntax

✖ 1 problem (1 error, 0 warnings)

[ELIFECYCLE] Command failed with exit code 1.
Error: ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL

  × "pnpm recursive run" failed in /Users/mj/repos/mccor-labs/app/web

exit=1
```

Colour rule fired exactly as required: `no-restricted-syntax` naming the colour-rule message, exit=1.

**Step 6** — `rm app/web/src/components/layout/__ruleprobe.tsx`, then
`rmdir app/web/src/components/layout` (removed the now-empty probe directory, which did not exist
before Step 5), then `pnpm -F web lint`:

```
$ eslint .
Pages directory cannot be found at /Users/mj/repos/mccor-labs/app/web/pages or /Users/mj/repos/mccor-labs/app/web/src/pages. If using a custom path, please configure with the `no-html-link-for-pages` rule in your eslint config file.
exit=0
```

Confirmed via `find app/web/src/components -maxdepth 2` that only pre-existing directories remain
(no `layout/`), and `git status --short` shows no untracked probe artifacts.

## `tsconfigRootDir` form used

Absolute, derived as `join(import.meta.dirname, 'app/web')` (see `eslint.config.ts:38`). The
relative form from the brief (`tsconfigRootDir: 'app/web'`) failed to resolve, producing
`parserOptions.tsconfigRootDir must be an absolute path, but received: "app/web"` on every
`app/web/**/*.{ts,tsx}` file the first time Step 4 was run. `import.meta.dirname` resolves to the
directory containing `eslint.config.ts` (the repo root), so the joined path is
`/Users/mj/repos/mccor-labs/app/web` — the same target directory either form was meant to reach.

## Caret/version substitutions

- `eslint`: brief said `^10`; installed `9.39.5` (a `^9` install) per team-lead ruling, because the
  exact-pinned `eslint-config-next@16.3.6` transitively depends on `eslint-plugin-react@7.37.5`
  (latest available), which only declares peer support up to `eslint@^9.7` and crashes on every
  linted file under `eslint@10.11.0` (`context.getFilename` was fully removed in ESLint 10; verified
  by grepping ESLint 10's own linter source, which contains no `getFilename` implementation at all).
  All other packages installed at the versions/ranges the brief specified, no other substitutions.

## Files changed (committed)

- `eslint.config.ts` — new file.
- `package.json` — root `devDependencies` gained `eslint` (`^9.39.5`), `typescript-eslint`
  (`^8.70.1`), `eslint-config-next` (`16.3.6`, exact), `eslint-plugin-jsx-a11y` (`^6.10.2`),
  `eslint-config-prettier` (`^10.1.8`), `jiti` (`^2.7.0`). `@eslint/eslintrc` was installed then
  removed in the same working session (Step 3 became obsolete once Step 2's config stopped using
  `FlatCompat` — see Deviation A above) and does **not** appear in the committed `package.json`.
- `pnpm-lock.yaml` — updated accordingly.

Commit: `f000549` — "chore(web): ESLint flat config with architecture rules". Only these three files
staged and committed (`git add eslint.config.ts package.json pnpm-lock.yaml`, no `-A`). Nothing
under `infra/` touched; `packageManager` field in `package.json` untouched.

## Self-review

Read the final `eslint.config.ts` in full before committing. Confirmed:
- All four project rules present and scoped exactly as the brief specifies: colour rule
  (`app/web/src/**/*.tsx`, ignoring `styles/**`), Motion import restriction
  (`app/web/src/**/*.{ts,tsx}`, ignoring `components/motion/**` and `components/effects/**`),
  effects-must-be-dynamic pattern (same block, `**/components/effects/*` group), content-cannot-
  import-components (`app/web/src/content/**/*.ts`).
- Test override (`no-non-null-assertion`, `no-unsafe-assignment`, `no-restricted-syntax` all turned
  off for test files) present and unmodified from the brief.
- `prettierConfig` (from `eslint-config-prettier/flat`) is the last entry in the config array.
- Nothing overbuilt: only the two forced fixes (native flat import + absolute `tsconfigRootDir`),
  the replicated `next-env.d.ts` ignore, and the de-duplicated `jsx-a11y` plugin registration were
  added beyond the brief's literal text — each is a direct, evidenced response to a real error, not
  a stylistic choice.

## Concerns

- Two upstream package-compatibility issues (the `eslint-plugin-react`/ESLint-10 crash and the
  `jsx-a11y` plugin double-registration under ESLint 9's stricter config-array merge) mean this
  config's exact shape is somewhat fragile to future ESLint/eslint-config-next upgrades — worth a
  short code comment for future maintainers (added inline at both sites) and worth re-checking next
  time either package's major version changes.
- `eslint@9.39.5` was flagged deprecated by npm at install time (`[WARN] deprecated eslint@9.39.5.
  10.11.0 is not deprecated, outside the range you declared`) — expected, since 9.x is no longer the
  latest major; this is the intended, ruled-on substitution, not an error.
