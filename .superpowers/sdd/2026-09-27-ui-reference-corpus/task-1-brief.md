# Task 1: npm surface

**These are your requirements. Use every value below verbatim.**

## Files

- Create: `package.json` (repo root, `/Users/mj/repos/mccor-labs/package.json`)
- Modify: `.gitignore` (repo root)

## Interfaces

- Consumes: nothing.
- Produces: a resolvable `@playwright/test` import for every later task.

## Global Constraints (bind this task)

- **Never commit, stage, or push.** Do not run `git add`, `git commit`, `git push`, or
  `git stash`. Leave everything as untracked / modified working-tree changes.
- **Every Bash step that touches the network or launches a browser must be run with
  `dangerouslyDisableSandbox: true`.** The sandbox denies Chromium's Mach port lookup and its
  `listen()` call, and the resulting errors never name the sandbox — you get
  `bootstrap_check_in ... Permission denied (1100)` or a bare launch timeout. `pnpm install` also
  needs it (network egress).
- **Import is `import { chromium, devices } from "@playwright/test";`** — never from `playwright`.
- Script conventions for this repo: plain `.mjs`, bare `node`, `node:`-prefixed builtins only,
  `resolve(import.meta.dirname, "..")` for repo root, `process.argv.includes("--flag")` parsing.

## AMENDMENT (Controller Ruling 9) — supersedes the original version range

This brief originally specified `"@playwright/test": "^1.56.0"`. That was a controller error: the
caret floats, and it resolved to 1.63.0, which wants Chromium revision **1243** while only 1223 and
1228 are on disk. The volume is at 89% capacity so a ~500MB browser download is unacceptable.

**The requirement is an EXACT pin of `1.61.0`** — the last version whose bundled browser revision
matches the installed chromium-1228 — plus the `"//"` rationale key shown below, so a future reader
does not reintroduce the caret. The Step 1 JSON below has been corrected in place; `^1.56.0` no
longer appears anywhere in this brief.

Verified by the controller after the fix:
```
LAUNCH OK: 149.0.7827.55
VIDEO FILES: page@c6f5af84093c7833994bf4835059777a.webm (6013 bytes)
@playwright/test@1.61.0
```
The video probe was added beyond the original brief because Playwright's bundled ffmpeg ships on a
revision track separate from Chromium's; had it been broken at this pin, Task 8's transition captures
and all ten scroll-session webms would have been impossible.

## Steps

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "mccor-labs",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "description": "Infrastructure and tooling for mccor-labs. Node surface exists only to run scripts/.",
  "engines": { "node": ">=24", "pnpm": ">=10" },
  "packageManager": "pnpm@12.6.0",
  "scripts": {
    "recon": "node scripts/recon-reference-sites.mjs",
    "capture": "node scripts/capture-reference-site.mjs"
  },
  "//": "@playwright/test is pinned EXACTLY, not caret-ranged: 1.61.0 is the last version whose bundled browser revision matches the chromium-1228 already in ~/Library/Caches/ms-playwright. A caret range floats to a version that wants a newer revision and triggers a ~500MB download onto a volume at 89% capacity. Re-pin only alongside a deliberate `playwright install`.",
  "devDependencies": {
    "@playwright/test": "1.61.0"
  }
}
```

- [ ] **Step 2: Append to `.gitignore`**

Append exactly this block to the existing `.gitignore` (do not rewrite the file; the existing
entries `.terraform/`, `*.tfstate*`, `crash.log`, `terraform.tfvars`, `settings.auto.tfvars`,
`.build/` must all survive):

```gitignore

# Node tooling for scripts/
node_modules/
pnpm-lock.yaml
package-lock.json
```

- [ ] **Step 3: Install, sandbox disabled**

Run with `dangerouslyDisableSandbox: true` (network egress required):

```bash
cd /Users/mj/repos/mccor-labs && pnpm install
```

Expected: `@playwright/test` resolves. Browsers are **already installed** in
`~/Library/Caches/ms-playwright/` (chromium v1223 and v1228, ffmpeg v1011) — do **not** run
`playwright install`. If pnpm reports a peer or engine warning, record it but do not act on it.

- [ ] **Step 4: Verify the import resolves and Chromium launches**

Run with `dangerouslyDisableSandbox: true`:

```bash
cd /Users/mj/repos/mccor-labs && node -e '
import("@playwright/test").then(async ({ chromium }) => {
  const b = await chromium.launch();
  console.log("launched", b.version());
  await b.close();
});'
```

Expected: prints `launched` and a version like `142.0.xxxx.xx`.

Failure modes and what they mean:

- `MODULE_NOT_FOUND` → the import path is wrong. It must be `@playwright/test`, never `playwright`.
- Hangs, or prints `bootstrap_check_in ... Permission denied (1100)` → the sandbox was not
  disabled. Re-run with `dangerouslyDisableSandbox: true`.
- `Executable doesn't exist at …` → the installed `@playwright/test` version wants a Chromium build
  newer than v1228. Report this as a concern with the exact expected path; do NOT run
  `playwright install` (it downloads ~500MB and the volume is at 89% capacity). The correct fix is
  to pin `@playwright/test` to the version matching the installed browser revision.

## Definition of done for this task

1. `package.json` exists at repo root with exactly the content in Step 1.
2. `.gitignore` retains all its prior entries and gains the three Node entries.
3. `pnpm install` completed and `node_modules/@playwright/test` exists.
4. The Step 4 verification printed `launched` and a Chromium version.
5. `git status --short` shows `package.json` as untracked and `.gitignore` as modified. **Nothing
   staged, nothing committed.**
