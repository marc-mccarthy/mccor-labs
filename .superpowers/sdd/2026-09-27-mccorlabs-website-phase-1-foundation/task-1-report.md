# Task 1 Report: Workspace skeleton, gitignore fix, committed lockfile

## Status: DONE

## What was implemented

1. **`pnpm-workspace.yaml`** created at repo root:
   ```yaml
   packages:
     - 'app/*'
   ```

2. **`package.json`** merged (not replaced). Added `dev`, `build`, `build:raw`, `test`,
   `verify`, `format`, `format:check` scripts alongside the existing `recon` and `capture`.
   `verify` ends in `pnpm build` (not `pnpm -F web build`) per the decision note, so the
   production build route goes through `op run`. Left `name`, `version`, `private`, `type`,
   `description`, `engines`, `packageManager`, the `"//"` comment, and `devDependencies`
   untouched.

3. **`.node-version`** created containing `24`.

4. **`.gitignore`** fixed: removed the `pnpm-lock.yaml` and `package-lock.json` ignore
   lines, kept `node_modules/`, and appended the Next.js build output, test artefact,
   `.env.local`, and `.media-work/` blocks exactly as specified.

5. Ran `pnpm install` (see verification below) which generated/confirmed `pnpm-lock.yaml`
   at the root.

6. Committed all five files in one commit.

## Verification commands run (actual output)

**Step 2 — script/pin/comment check:**
```
$ node -e "const p=require('./package.json'); console.log(Object.keys(p.scripts).join(' ')); console.log('pin:', p.devDependencies['@playwright/test']); console.log('comment kept:', Boolean(p['//']))"
recon capture dev build build:raw test verify format format:check
pin: 1.61.0
comment kept: true
```
Matches expected (`recon capture dev build test verify format format:check` all present,
plus the extra `build:raw` the brief also asks for; pin `1.61.0`; comment kept `true`).

**Step 5 — install:**
```
$ PATH=/opt/homebrew/bin:$PATH pnpm install
Already up to date
Done in 11ms using pnpm v12.6.0
```
No "No projects matched" warning. `app/*` is empty, which is expected — nothing to resolve
there yet. `pnpm-lock.yaml` present at root (210 lines added when committed; it already
existed untracked/ignored from before this task, `pnpm install` left it unchanged).

**Step 6 — lockfile ignore check:**
```
$ git check-ignore -v pnpm-lock.yaml; echo "exit=$?"
exit=1
```
No output, `exit=1` — no ignore rule matches. Confirms the `.gitignore` edit took effect.

## Files changed (commit `a23e517`)

```
 .gitignore          |  18 ++++-
 .node-version       |   1 +
 package.json        |   9 ++-
 pnpm-lock.yaml      | 210 ++++++++++++++++++++++++++++++++++++++++++++++++++++
 pnpm-workspace.yaml |   2 +
 5 files changed, 237 insertions(+), 3 deletions(-)
```

Commit message: `chore(web): pnpm workspace skeleton, commit the lockfile`

## Self-review

- Diffed the commit (`git show HEAD -- .gitignore package.json pnpm-workspace.yaml
  .node-version`) and confirmed:
  - `.gitignore`: only the two specified lines removed, only the specified block appended,
    nothing else touched.
  - `package.json`: only `scripts` gained new entries; `packageManager`, `engines`,
    `"//"` comment, `devDependencies`, `private`, `type`, `description`, `version`, `name`
    all byte-identical to before.
  - `pnpm-workspace.yaml` and `.node-version`: match the brief verbatim.
  - No files outside the Step 7 list were staged or committed.
- Confirmed `infra/` was never touched (not read, not in diff).
- Confirmed no `aws` command was run.
- Confirmed only Homebrew pnpm (`/opt/homebrew/bin/pnpm`, v12.6.0) was invoked; never ran
  bare `pnpm`, never ran `playwright install`, never widened the Playwright pin.
- One commit created, exactly as instructed; no other commits made.

## Concerns

None. The root `package.json` matched the brief's description exactly before editing, and
all verification steps produced the expected output on the first attempt.
