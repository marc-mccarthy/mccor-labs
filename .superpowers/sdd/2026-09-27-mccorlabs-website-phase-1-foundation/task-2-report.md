# Task 2 Report: Next.js site package at app/web

## Summary

Implemented Steps 2–11 of the brief (Step 1 skipped per instructions — `app/` was
confirmed empty, no `index.html`/`app.js` placeholders existed). Created the `web`
package with the pinned Next 16 / React 19 stack, TypeScript config, Vitest config,
test setup, and the Step 9 workspace-resolution test. All verification commands ran
and are recorded below with real output. One commit created.

## What was implemented

- `app/web/package.json` — package named `web` per Step 2, exact deps
  `next@16.3.6`, `react@19.3.0`, `react-dom@19.3.0`. Two caret-major substitutions
  (see below).
- `app/web/next.config.ts` — static export (`output: 'export'`, `trailingSlash: true`,
  `images.unoptimized: true`), verbatim from the brief.
- `app/web/tsconfig.json` — verbatim from the brief, including `@/*` → `./src/*`.
- `app/web/next-env.d.ts` — standard Next.js-generated triple-slash reference file
  (brief listed it under "Create" but gave no body; used Next's standard boilerplate).
- `app/web/vitest.config.ts` — verbatim from the brief.
- `app/web/src/test/setup.ts` — verbatim from the brief.
- `app/web/tests/workspace.test.ts` — verbatim from the brief (Step 9).

## Verification commands and actual output

**Step 5: install**
```
$ PATH=/opt/homebrew/bin:$PATH pnpm install
...
Packages: +169
Done in 15.6s using pnpm v12.6.0
```
Confirmed exact pins landed:
```
$ pnpm -F web ls next react react-dom
web@0.1.0 /Users/mj/repos/mccor-labs/app/web (PRIVATE)
├── next@16.3.6
├── react@19.3.0
└── react-dom@19.3.0
```

**Step 8: test runner starts (before Step 9's test file existed)**
```
$ pnpm -F web test:run
 RUN  v5.0.2 /Users/mj/repos/mccor-labs/app/web
No test files found, exiting with code 1
EXIT: 1
```
Deviation from the brief's expectation ("exits 0 reporting 'No test files found'"):
Vitest 5's `run` mode exits **1**, not 0, when no test files match. This is
standard Vitest 5 behavior (changed from earlier majors), not a symptom of the
caret substitutions or a misconfiguration — the message itself ("No test files
found") matched exactly. Since Step 9 immediately adds a real test file, this
was moot in practice; re-ran after Step 9 to confirm:

**Step 9 test, after creation**
```
$ pnpm -F web test:run
 RUN  v5.0.2 /Users/mj/repos/mccor-labs/app/web
 Test Files  1 passed (1)
      Tests  2 passed (2)
   Duration  495ms
EXIT: 0
```
Both assertions (`pkg.name === 'web'` and the static-export config matchers) pass.

**Step 10: pnpm filter check**
```
$ pnpm -F web exec node -e "console.log('filter-ok')"
filter-ok
EXIT: 0
```
Confirms `name: "web"` correctly resolves via `pnpm -F web`.

## Caret-major substitutions

Two of the brief's caret-ranged devDependencies do not resolve at the major the
brief guessed; installed the newest available major instead, per the version
policy in my instructions:

- `@testing-library/dom@^11` → **`^10`** (latest published is `10.4.2`; no `11.x`
  exists on npm).
- `@testing-library/react@^17` → **`^16`** (latest published is `16.3.3`; no
  `17.x` exists on npm).

All other caret devDependencies (`@testing-library/jest-dom@^6`, `@types/node@^22`,
`@types/react@^19`, `@types/react-dom@^19`, `@vitejs/plugin-react@^5`, `jsdom@^27`,
`typescript@^5`, `vite-tsconfig-paths@^5`, `vitest@^5`) resolved as given — no other
substitutions needed. No dependency was dropped.

Vitest also printed one informational warning during runs (not an error):
```
The plugin "vite-tsconfig-paths" is detected. Vite now supports tsconfig paths
resolution natively via the resolve.tsconfigPaths option. You can remove the
plugin and set resolve.tsconfigPaths: true in your Vite config instead.
```
Left the config as the brief specifies it (with the plugin) rather than
deviating from the given file content.

## Files changed

```
A  app/web/next-env.d.ts
A  app/web/next.config.ts
A  app/web/package.json
A  app/web/src/test/setup.ts
A  app/web/tests/workspace.test.ts
A  app/web/tsconfig.json
A  app/web/vitest.config.ts
M  pnpm-lock.yaml
```
(Root `package.json` was staged per Step 11's instruction but had no changes —
it was already correct from Task 1.)

## Commit

```
71e843a feat(web): Next.js 16 site package configured for static export
8 files changed, 2319 insertions(+), 18 deletions(-)
```

## Self-review

- No `.js`/`.jsx` files exist under `app/web/src` — confirmed via
  `find app/web/src -type f` (only `setup.ts`).
- No stray files: `git status --short` before staging showed only `app/`
  (untracked, all wanted) and `pnpm-lock.yaml` (modified).
- `.gitignore` already covers `app/web/.next/`, `app/web/out/`, and
  `node_modules/`, so no build artifacts were staged.
- Every file matches the brief's given content verbatim except `next-env.d.ts`
  (brief gave no body for this file) and the two caret-major substitutions
  noted above.
- Did not touch `infra/`, did not run `playwright install`, did not widen the
  `@playwright/test` pin, did not add Playwright to `app/web`, did not create
  or delete branches, did not run any `aws` command.
- Only one commit was created, matching Step 11's message exactly.

## Concerns

- The `test:run` exit-code discrepancy in Step 8 (Vitest 5 exits 1, not 0, on
  zero test files) is worth flagging to whoever wrote the brief in case other
  tasks/CI steps assume exit 0 for an empty suite — not a blocker here since a
  real test file exists after Step 9, but could bite a future package that
  briefly has no tests.
- `next-env.d.ts`'s exact content wasn't specified in the brief; used Next's
  standard boilerplate. Next may rewrite this file automatically on the first
  `next dev`/`next build` in a later task — expected and harmless.
