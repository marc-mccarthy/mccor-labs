# Task 5 Report: Lefthook git hooks, verified by actually failing

## Summary

Implemented Lefthook 2.1.14 with a fast `pre-commit` (Prettier + ESLint on staged files) and a
strict `pre-push` (typecheck, lint, format-check, unit tests, production build, e2e smoke). Proved
the pre-commit hook actually runs by committing a deliberately misformatted probe file and showing
Prettier reformatted it inside the commit. Folded the probe commit into the single task commit per
ruling 3.

**One important environment finding: git hooks invoked with the plain PATH fail**, because plain
`pnpm` resolves to a wrapper that tries to self-install the `packageManager` pin `pnpm@12.6.0`,
which does not exist on the npm registry (only `@pnpm/macos-arm64` up to `11.28.0` is published).
This reproduces exactly the failure mode flagged in my task context, and per instruction I did not
work around it (e.g. hardcoding `/opt/homebrew/bin` into `lefthook.yml`) — see Concerns.

## Steps implemented

### Step 1: Install Lefthook

```
$ PATH=/opt/homebrew/bin:$PATH pnpm add -D -w lefthook@2.1.14
...
devDependencies:
+ lefthook 2.1.14
Done in 15s using pnpm v12.6.0
```

### Step 2: Allow Lefthook's postinstall script

```
$ PATH=/opt/homebrew/bin:$PATH pnpm approve-builds lefthook
[WARN] The following packages are not awaiting approval: lefthook
```

pnpm had already recorded the approval automatically during `pnpm add` (no interactive prompt was
needed in this environment). Confirmed the block was written:

```
$ grep -A3 -iE 'allowBuilds|onlyBuiltDependencies' pnpm-workspace.yaml
allowBuilds:
  lefthook: true
```

No manual edit to `pnpm-workspace.yaml` was needed — `approve-builds` had already written it.

### Step 3: Reinstall so the hooks actually install (quoted in full)

First attempt — `pnpm install` alone did not install the hooks (no `lefthook.yml` existed yet to
sync against):

```
$ PATH=/opt/homebrew/bin:$PATH pnpm install
Scope: all 2 workspace projects
✓ Lockfile passes supply-chain policies (verified 18s ago)
Lockfile is up to date, resolution step is skipped
Already up to date
Done in 549ms using pnpm v12.6.0
$ test -f .git/hooks/pre-commit && echo "hooks-installed"
(nothing printed — hooks NOT installed)
```

Per the brief's fallback, ran `pnpm exec lefthook install` directly. It generated a default
(all-commented) config first:

```
$ PATH=/opt/homebrew/bin:$PATH pnpm exec lefthook install
Config not found, creating...
Added config:/Users/mj/repos/mccor-labs/lefthook.yml
sync hooks: ✔️
$ test -f .git/hooks/pre-commit && echo "hooks-installed"
(nothing printed — still NOT installed, config had no active jobs)
```

Wrote the real `lefthook.yml` (Step 5 content, with ruling 4 applied), then re-ran:

```
$ PATH=/opt/homebrew/bin:$PATH pnpm exec lefthook install
sync hooks: ✔️(pre-commit, pre-push)
$ test -f .git/hooks/pre-commit && echo "hooks-installed"
hooks-installed
```

`hooks-installed` printed. Confirmed before continuing.

### Step 4: Confirm the verify script (quoted in full)

```
$ node -e "const s=require('./package.json').scripts; if(!s.verify) throw new Error('verify script missing — revisit Task 1 Step 2'); if(!s.verify.includes('pnpm build')) throw new Error('verify must call pnpm build so the build goes through op run'); console.log('verify ok:', s.verify)"
verify ok: pnpm -F web exec tsc --noEmit && pnpm -F web lint && pnpm format:check && pnpm -F web test:run && pnpm build
```

Ends in `&& pnpm build` as required. Not re-added; Task 1's script was already correct.

### Step 5: Create the hooks config

Wrote `lefthook.yml` exactly as the brief specifies, with ruling 4 applied: `pre-push.build` runs
`pnpm build` (root script, routes through `op run`/1Password once Task 7 restores the wrapper) —
not `pnpm -F web build`.

### Step 6: Prove the pre-commit hook reformats a bad file (quoted in full)

Wrote the probe:

```
$ printf 'export const probe  =   {a:1,   b:2}\n' > app/web/src/__hookprobe.ts
$ cat -A app/web/src/__hookprobe.ts
export const probe  =   {a:1,   b:2}$
```

First commit attempt used the plain PATH (as a real hook invocation would) and failed — see
Concerns for the full failure and why I did not work around it in `lefthook.yml`:

```
$ git add app/web/src/__hookprobe.ts
$ git commit -m "test: hook probe"
🥊 lefthook  v2.1.14   hook:  pre-commit
┃  format ❯
 ERR_PNPM_NO_MATCHING_VERSION  No matching version found for @pnpm/macos-arm64@12.6.0 ...
┃  lint ❯
 ERR_PNPM_NO_MATCHING_VERSION  No matching version found for @pnpm/macos-arm64@12.6.0 ...
summary: (done in 1.40 seconds)
🥊 format (1.38 seconds)
🥊 lint (1.39 seconds)
(exit 1, commit aborted, nothing committed)
```

Retried with `/opt/homebrew/bin` on PATH (the pnpm 12.6.0 that actually exists), to verify the hook
config itself is correct:

```
$ PATH=/opt/homebrew/bin:$PATH git commit -m "test: hook probe"
🥊 lefthook  v2.1.14   hook:  pre-commit
┃  format ❯
app/web/src/__hookprobe.ts 54ms
┃  lint ❯
summary: (done in 3.17 seconds)
✔️ format (0.48 seconds)
✔️ lint (3.14 seconds)
[feat/mail-server 7b98dbf] test: hook probe
 1 file changed, 1 insertion(+)
 create mode 100644 app/web/src/__hookprobe.ts
```

Verification (quoted in full):

```
$ git show --stat HEAD | head -5
commit 7b98dbf7304185aa8264bc255c06c519f637704f
Author: Marc McCarthy <marstheory20@gmail.com>
Date:   Sun Sep 27 23:34:39 2026 -0500

    test: hook probe

$ cat app/web/src/__hookprobe.ts
export const probe = { a: 1, b: 2 }
```

**Before:** `export const probe  =   {a:1,   b:2}\n` (double spaces, no braces spacing)
**After (committed):** `export const probe = { a: 1, b: 2 }\n` (single spaces, spaced braces,
no semicolon — Prettier style)

Byte diff confirms they differ:

```
$ printf 'export const probe  =   {a:1,   b:2}\n' | diff - app/web/src/__hookprobe.ts
1c1
< export const probe  =   {a:1,   b:2}
---
> export const probe = { a: 1, b: 2 }
DIFFERENT (reformatted - GOOD)
```

The pre-commit hook demonstrably ran and reformatted the file before the commit was made.

### Step 7: Remove the probe and amend it away (ruling 2 & 3 applied)

Per ruling 3, folded the probe removal and the real task files into one amended commit instead of
two separate commits:

```
$ git rm app/web/src/__hookprobe.ts
rm 'app/web/src/__hookprobe.ts'
$ git add lefthook.yml package.json pnpm-workspace.yaml pnpm-lock.yaml
$ PATH=/opt/homebrew/bin:$PATH git commit --amend -m "chore(web): pre-push verification gate

Staging package.json for the lefthook devDependency also carries an
unrelated concurrent edit to the dev/build scripts from another session.
The op run wrapper those scripts lost is restored in Task 7, where
app/web/.env.template is created."
🥊 lefthook  v2.1.14   hook:  pre-commit
┃  format ❯
lefthook.yml 15ms (unchanged)
package.json 7ms (unchanged)
pnpm-workspace.yaml 2ms (unchanged)
summary: (done in 0.32 seconds)
✔️ format (0.29 seconds)
[feat/mail-server 0dd5135] chore(web): pre-push verification gate
 4 files changed, 141 insertions(+), 2 deletions(-)
 create mode 100644 lefthook.yml
```

Step 8 (a separate `git commit`) was intentionally not run, per ruling 3.

## Final verification

```
$ git log --oneline -3
0dd5135 chore(web): pre-push verification gate
f000549 chore(web): ESLint flat config with architecture rules
771877d chore(web): Prettier at the workspace root with Tailwind class sorting
```

No `test: hook probe` commit survives.

```
$ git status --short
 M infra/deploy.sh
```

Only the other session's `infra/deploy.sh` remains modified. `package.json`'s unrelated dev/build
edit from the other session was carried into this commit as ruling 5 anticipated (it is no longer
listed separately in `git status` because it's now committed).

```
$ git show HEAD --stat
 lefthook.yml        |  35 ++++++++++++++++++
 package.json        |   6 ++--
 pnpm-lock.yaml      | 100 ++++++++++++++++++++++++++++++++++++++++++++++++++++
 pnpm-workspace.yaml |   2 ++
 4 files changed, 141 insertions(+), 2 deletions(-)
```

## Files changed (committed)

- `lefthook.yml` — new, pre-commit (format/lint) and pre-push (typecheck/lint/format-check/test/build/e2e) hooks
- `package.json` — added `lefthook: 2.1.14` devDependency; also carries the other session's
  unrelated `dev`/`build`/`//dev` edit (see commit body)
- `pnpm-workspace.yaml` — added `allowBuilds: { lefthook: true }`
- `pnpm-lock.yaml` — updated for the new dependency

`infra/deploy.sh` was never staged or touched.

## approve-builds behavior

`pnpm approve-builds lefthook` reported "not awaiting approval" — pnpm had already recorded the
`allowBuilds: lefthook: true` block in `pnpm-workspace.yaml` automatically during `pnpm add -D -w
lefthook@2.1.14`, without an interactive prompt in this environment. No manual edit was required.

## Self-review

- `lefthook.yml` content matches the brief verbatim except the ruling-4 substitution
  (`pre-push.build` → `pnpm build` instead of `pnpm -F web build`). Confirmed via `git show HEAD --
  lefthook.yml`.
- `package.json` diff is exactly: the `lefthook` devDependency addition, plus the pre-existing
  unrelated `dev`/`build`/`//dev` change from the other session (not introduced by me — it was
  already unstaged in the working tree per the task briefing). Nothing else in `package.json`
  changed (the `verify` script is untouched, confirming Step 4's "don't re-add it").
- `pnpm-workspace.yaml` diff is exactly the two-line `allowBuilds` addition.
- Single commit, correct subject, commit body present and accurate.
- `infra/deploy.sh` untouched throughout (never staged, never in any diff).
- No `npm`/`yarn` commands were run — pnpm only, per the global constraint.
- No `aws` command was run, and nothing under `infra/` was created, edited, or deleted.

## Concerns

**Git hooks run with the plain PATH, and plain PATH resolution of `pnpm` is broken in this
environment**, exactly as flagged in my task context. `pnpm` on the bare PATH resolves to
`/Users/mj/.local/share/pnpm/pnpm`, a wrapper that reads the `packageManager` pin (`pnpm@12.6.0`)
and tries to self-install the matching platform binary. That version does not exist upstream:

```
ERR_PNPM_NO_MATCHING_VERSION  No matching version found for @pnpm/macos-arm64@12.6.0
The latest release of @pnpm/macos-arm64 is "11.28.0".
```

This means **any real `git commit` or `git push` run by a developer whose shell doesn't already
prioritize Homebrew's pnpm on PATH will see the pre-commit/pre-push hooks fail outright**, not
because of anything in `lefthook.yml`, but because bare `pnpm` cannot resolve at all. I reproduced
this failure with an unmodified PATH (Step 6's first commit attempt, quoted above) and did not work
around it inside `lefthook.yml` (e.g., by hardcoding `/opt/homebrew/bin/pnpm` or an absolute path),
per instruction, since that would only mask the same problem for other real developers and
wouldn't fix the root cause (the `packageManager` pin points at a version that isn't published).
This is a pre-existing environment/tooling issue outside this task's scope — it also blocks plain
`pnpm install`/`pnpm build`, etc., not just the hooks — and should be raised separately as a
blocker for anyone whose shell PATH doesn't already resolve to Homebrew's pnpm 12.6.0.

No other concerns. The lefthook configuration itself is correct and was verified end-to-end with a
working pnpm resolution.

---

## Fix round 1: make the hooks work under a plain PATH

Team lead confirmed the plain-PATH finding was a real defect (a hook that only works when the
developer manually prefixes `PATH` is not a working hook) and directed the fix: prefix every
`run:` line in `lefthook.yml` with `PATH=/opt/homebrew/bin:$PATH `, add an explanatory comment, and
land this as a **new commit** (not an amend), since another session had already committed
`d4431d8 fix(infra): non-interactive 1Password auth for deploy.sh` on top of my prior commit.

### What changed

`lefthook.yml` only — no changes to `package.json`, `pnpm-workspace.yaml`, or the `packageManager`
field. Added the explanatory comment block and prefixed all eight `run:` lines (2 in `pre-commit`,
6 in `pre-push`) with `PATH=/opt/homebrew/bin:$PATH `.

### Re-proving Step 6 the honest way (quoted in full)

Wrote the probe again and committed with a **plain `git commit`, no `PATH=` prefix on the git
command itself** — the point being an ordinary developer commit now works:

```
$ printf 'export const probe  =   {a:1,   b:2}\n' > app/web/src/__hookprobe.ts
$ git add app/web/src/__hookprobe.ts
$ git commit -m "test: hook probe"
🥊 lefthook  v2.1.14   hook:  pre-commit
sync hooks: ✔️(pre-commit, pre-push)
┃  format ❯
app/web/src/__hookprobe.ts 54ms
lefthook.yml 11ms (unchanged)
┃  lint ❯
summary: (done in 4.10 seconds)
✔️ format (1.09 seconds)
✔️ lint (4.09 seconds)
[feat/mail-server 432803d] test: hook probe
 2 files changed, 15 insertions(+), 8 deletions(-)
 create mode 100644 app/web/src/__hookprobe.ts
```

This is the same shell session's normal PATH as the original failing attempt — no PATH override on
the `git commit` invocation. It succeeded because `lefthook.yml` itself now prepends Homebrew's bin
inside each `run:` command.

Verification (quoted in full):

```
$ git show --stat HEAD | head -6
commit 432803de94072cfd09049722ef118ca1ef127bbd
Author: Marc McCarthy <marstheory20@gmail.com>
Date:   Mon Sep 28 00:20:31 2026 -0500

    test: hook probe

$ cat app/web/src/__hookprobe.ts
export const probe = { a: 1, b: 2 }

$ printf 'export const probe  =   {a:1,   b:2}\n' | diff - app/web/src/__hookprobe.ts
1c1
< export const probe  =   {a:1,   b:2}
---
> export const probe = { a: 1, b: 2 }
DIFFERENT (reformatted - GOOD)
```

Reformatted under a plain PATH, proving the fix works for an ordinary developer commit.

### Removing the probe and finalizing the fix commit

```
$ git rm app/web/src/__hookprobe.ts
rm 'app/web/src/__hookprobe.ts'
$ git commit --amend -m "fix(web): resolve pnpm in git hooks via Homebrew PATH"
🥊 lefthook  v2.1.14   hook:  pre-commit
│  lint (skip) no files for inspection
│  format (skip) no files for inspection
summary: (done in 0.02 seconds)
[feat/mail-server aab1b57] fix(web): resolve pnpm in git hooks via Homebrew PATH
 1 file changed, 14 insertions(+), 8 deletions(-)
```

(The probe commit `432803d` and this amend are the same in-progress commit from the developer's
perspective — amending it before ever pushing keeps history clean while still being one new commit
relative to `d4431d8`/`0dd5135`, per the team lead's ruling that this round is allowed a second
commit.)

### Final verification

```
$ git log --oneline -5
aab1b57 fix(web): resolve pnpm in git hooks via Homebrew PATH
d4431d8 fix(infra): non-interactive 1Password auth for deploy.sh
0dd5135 chore(web): pre-push verification gate
f000549 chore(web): ESLint flat config with architecture rules
771877d chore(web): Prettier at the workspace root with Tailwind class sorting

$ git status --short
(empty — clean working tree)
```

No `test: hook probe` commit survives. `git show HEAD` (full diff, confirmed above) touches only
`lefthook.yml`: the new comment block and the eight `PATH=/opt/homebrew/bin:$PATH ` prefixes.
`package.json`, `pnpm-workspace.yaml`, and `infra/` are untouched by this fix.

### pre-push hook confirmation

```
$ test -f .git/hooks/pre-push && echo "pre-push exists"
pre-push exists
```

`.git/hooks/pre-push` exists (installed by lefthook's earlier sync) and its config source,
`lefthook.yml`, now carries the eight fixed `run:` lines under `pre-push` (typecheck, lint,
format-check, test, build, e2e — each prefixed with `PATH=/opt/homebrew/bin:$PATH`). Did not run
`git push`; per the team lead's instruction, Task 13 covers the real push-refusal proof.

### Self-review (fix round 1)

- Only `lefthook.yml` changed; diff is exactly the comment addition plus the eight PATH prefixes,
  nothing else reformatted or reordered.
- `packageManager` field in `package.json` untouched, `package.json` untouched entirely.
- Commit message matches exactly what was requested: `fix(web): resolve pnpm in git hooks via
  Homebrew PATH`.
- Two commits now exist for this task's overall work (`0dd5135` and `aab1b57`), per the team lead's
  explicit ruling that amending/resetting `d4431d8` would rewrite another session's work.
- No `npm`/`yarn` used; no `aws` command run; `infra/` never touched.

### Concerns (fix round 1)

None. The root cause (plain `pnpm` on PATH self-installing a nonexistent `pnpm@12.6.0` binary)
remains unresolved at the environment level, as instructed — this fix only makes the git hooks
resilient to it, and the comment in `lefthook.yml` documents why.
