# Task 3 Report: Prettier at the repository root

## What was implemented

- Installed `prettier@3.9.9` (exact pin, resolved cleanly) and
  `prettier-plugin-tailwindcss@0.8.1` (from `^0.8.1`, resolved cleanly — no
  caret substitution needed) at the workspace root via
  `PATH=/opt/homebrew/bin:$PATH pnpm add -D -w prettier@3.9.9 prettier-plugin-tailwindcss@^0.8.1`.
- Created `prettier.config.ts` exactly as specified in the brief.
- Created `.prettierignore` exactly as specified in the brief, plus the
  team-lead's additional `.superpowers/` entry.
- Created `app/web/src/styles/globals.css` as a **Branch A stub** (see
  "Blocker and resolution" below) — a comment-only placeholder, per the
  team-lead's ruling, so `prettier-plugin-tailwindcss` can resolve
  `tailwindStylesheet` without throwing.
- Ran `pnpm format`, which reformatted 12 pre-existing files.
- Committed once.

## Blocker encountered and how it was resolved

Ruling #6 from the dispatch (repeating an assumption in the plan) claimed
`prettier-plugin-tailwindcss` "tolerates" a `tailwindStylesheet` path that
doesn't exist yet and "simply does not sort classes." This is **not what
happens** with the versions that actually resolved
(`prettier-plugin-tailwindcss@0.8.1` + `prettier@3.9.9` + Node 24.20.0).

Initial `pnpm format:check` (before any stub existed) crashed with `ENOENT`
on every JS/TS-parsed file in the repo (confirmed twice, deterministic):

```
[error] app/web/next-env.d.ts: Error: ENOENT: no such file or directory, open '/Users/mj/repos/mccor-labs/app/web/src/styles/globals.css'
[error] app/web/next.config.ts: Error: ENOENT: ...
[error] app/web/src/test/setup.ts: Error: ENOENT: ...
[error] app/web/tests/workspace.test.ts: Error: ENOENT: ...
[error] app/web/vitest.config.ts: Error: ENOENT: ...
[error] prettier.config.ts: Error: ENOENT: ...
[error] scripts/capture-ui-references.mjs: Error: ENOENT: ...
[error] scripts/lib/sites.mjs: Error: ENOENT: ...
[error] scripts/recon-reference-sites.mjs: Error: ENOENT: ...
[error] scripts/verify-site-selectors.mjs: Error: ENOENT: ...
Error occurred when checking code style in 10 files.
[ELIFECYCLE] Command failed with exit code 2.
```

I traced the cause in the installed plugin's source
(`node_modules/.pnpm/prettier-plugin-tailwindcss@0.8.1_prettier@3.9.9/.../dist/index.mjs`,
`getTailwindConfig`): it eagerly resolves `tailwindStylesheet` for any
JS/TS-parsed file and throws rather than degrading gracefully. Markdown files
were unaffected (only formatting `[warn]`s), which is why the failure looked
scoped to code files.

I stopped and reported BLOCKED to the team lead rather than creating Task 6's
file myself or downgrading the plugin by guesswork. The team lead ruled: try
a comment-only stub first (Branch A), then an `@import 'tailwindcss'` stub
(Branch B) if needed, then omit `tailwindStylesheet` entirely (Branch C) as a
last resort.

**Branch A succeeded.** Creating
`app/web/src/styles/globals.css` with only a comment:

```css
/* Tokens land in Task 6. This file exists from Task 3 so
   prettier-plugin-tailwindcss can resolve tailwindStylesheet. */
```

...eliminated all ENOENT errors. Re-running `pnpm format:check` twice gave
consistent, non-crashing output (files needing formatting, no errors):

```
$ prettier --check .
Checking formatting...
[warn] docs/content/careers.md
[warn] docs/content/job-postings.md
[warn] docs/content/privacy-policy.md
[warn] docs/content/services.md
[warn] docs/content/team.md
[warn] FUTURE-NOTES.md
[warn] PHASE_1_PROMPT.md
[warn] README.md
[warn] scripts/capture-ui-references.mjs
[warn] scripts/lib/sites.mjs
[warn] scripts/recon-reference-sites.mjs
[warn] scripts/verify-site-selectors.mjs
[warn] Code style issues found in 12 files. Run Prettier with --write to fix.
[ELIFECYCLE] Command failed with exit code 1.
```

(Exit 1 here is prettier's normal "needs formatting" result — one of the two
outcomes the brief's Step 4 explicitly allows — not a crash. No Branch B or C
needed.)

**IMPORTANT for Task 6:** Task 6 must **replace the stub's contents**
(not add a `tailwindStylesheet` line — that line already exists in
`prettier.config.ts` and points at this file). The stub is a placeholder
only; Task 6's real token CSS goes in the same file, at the same path.

## Verification commands and actual output

### Step 4: `pnpm format:check` (before Step 5, with stub in place)

Ran twice, both non-crashing, consistent output (shown above).

### Step 5: `pnpm format && pnpm format:check`

`pnpm format` output:

```
$ prettier --write .
.claude/settings.local.json 14ms (unchanged)
app/web/next-env.d.ts 34ms (unchanged)
app/web/next.config.ts 7ms (unchanged)
app/web/package.json 1ms (unchanged)
app/web/src/styles/globals.css 6ms (unchanged)
app/web/src/test/setup.ts 4ms (unchanged)
app/web/tests/workspace.test.ts 10ms (unchanged)
app/web/tsconfig.json 2ms (unchanged)
app/web/vitest.config.ts 2ms (unchanged)
docs/content/careers.md 52ms
docs/content/job-postings.md 30ms
docs/content/privacy-policy.md 25ms
docs/content/services.md 15ms
docs/content/team.md 11ms
FUTURE-NOTES.md 17ms
package.json 1ms (unchanged)
pnpm-workspace.yaml 7ms (unchanged)
prettier.config.ts 3ms (unchanged)
README.md 15ms
scripts/capture-ui-references.mjs 47ms
scripts/lib/sites.mjs 30ms
scripts/recon-reference-sites.mjs 18ms
scripts/verify-site-selectors.mjs 11ms
```

`pnpm format:check` output (idempotence confirmed):

```
$ prettier --check .
Checking formatting...
All matched files use Prettier code style!
```

### 12 pre-existing files reformatted

- `docs/content/careers.md`
- `docs/content/job-postings.md`
- `docs/content/privacy-policy.md`
- `docs/content/services.md`
- `docs/content/team.md`
- `FUTURE-NOTES.md`
- `PHASE_1_PROMPT.md`
- `README.md`
- `scripts/capture-ui-references.mjs`
- `scripts/lib/sites.mjs`
- `scripts/recon-reference-sites.mjs`
- `scripts/verify-site-selectors.mjs`

Types: 7 Markdown files, 4 JS scripts. Spot-checked `scripts/lib/sites.mjs`
diff — purely cosmetic (double quotes → single quotes, dropped trailing
semicolons per `semi: false`), no logic changes.

### `infra/` untouched — confirmed

```
$ git status --short -- infra/
(no output)
```

`git diff --stat` (pre-commit) and the final commit's file list both show no
path under `infra/`.

## Caret substitution

None needed. `prettier-plugin-tailwindcss@^0.8.1` resolved to `0.8.1`
cleanly.

## Files changed (final commit `771877d`)

```
.prettierignore                   |  10 + (new)
FUTURE-NOTES.md                   |  16 +- (reformat)
PHASE_1_PROMPT.md                 |  32 +- (reformat)
README.md                         |  24 +- (reformat)
app/web/src/styles/globals.css    |   2 + (new — Branch A stub, see above)
docs/content/careers.md           |   8 + (reformat)
docs/content/job-postings.md      |  14 +- (reformat)
docs/content/privacy-policy.md    |  26 +- (reformat)
docs/content/services.md          |   7 +- (reformat)
docs/content/team.md              |  12 +- (reformat)
package.json                      |   4 +- (devDependencies)
pnpm-lock.yaml                    |  72 +++++ (lockfile)
prettier.config.ts                |  17 ++ (new)
scripts/capture-ui-references.mjs | 598 ++++++++++++++++++++++++------------- (reformat)
scripts/lib/sites.mjs             | 563 +++++++++++++++++------------------ (reformat)
scripts/recon-reference-sites.mjs | 470 ++++++++++++++---------------- (reformat)
scripts/verify-site-selectors.mjs | 255 ++++++++-------- (reformat)
```

17 files changed, 1202 insertions(+), 928 deletions(-).

## Self-review findings

- `prettier.config.ts` matches the brief's values verbatim (semi, quotes,
  trailingComma, printWidth, plugins order, tailwindStylesheet path).
- `.prettierignore` carries every brief-listed entry plus the team-lead's
  `.superpowers/` addition.
- `package.json` diff is minimal — only the two new devDependencies added,
  nothing else touched.
- No unrelated/untracked files were swept into the commit — staged
  explicitly via `git add prettier.config.ts .prettierignore package.json
  pnpm-lock.yaml app/web/src/styles/globals.css && git add -u`, confirmed
  clean via `git status --short` before committing.
- `infra/` confirmed untouched both before and after the commit.
- Reformatted script diffs spot-checked as cosmetic-only.

## Concerns

1. **Task 6 must replace, not add to, `app/web/src/styles/globals.css`** —
   the stub already exists and `tailwindStylesheet` already points at it.
   Relayed to the team lead already; repeating here for the record.
2. Ruling #6 in the dispatch was based on the plan's incorrect assumption
   about plugin behavior. The team lead has already acknowledged this and
   is carrying the correction into Task 6's dispatch — flagging in case
   other tasks also relied on that same assumption.
3. `.superpowers/` reformats were correctly excluded — verified none of the
   session's scratch files under `.superpowers/` appear in `git status`
   output or the commit.

## Commit

```
771877d chore(web): Prettier at the workspace root with Tailwind class sorting
```
