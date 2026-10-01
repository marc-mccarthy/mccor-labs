## Task 1: Workspace skeleton, gitignore fix, committed lockfile

**Files:**
- Create: `pnpm-workspace.yaml`, `.node-version`
- Modify: `package.json` (already exists — merge, do not replace), `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: a pnpm workspace where `app/*` are packages; a root `package.json` with scripts `format`, `format:check` (more added later).

- [ ] **Step 1: Create the workspace file**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - 'app/*'
```

- [ ] **Step 2: Merge workspace fields into the existing root package.json**

A root `package.json` already exists, created by the reference-corpus effort. It owns the `recon` and `capture` scripts and an exactly-pinned `@playwright/test`. **Do not overwrite it.** Read it first, then add only what is missing, preserving every existing field — especially the `"//"` comment and the exact Playwright pin, both of which are load-bearing.

Add these `scripts` entries alongside the existing `recon` and `capture`:

```json
    "dev": "op run --env-file=app/web/.env.template -- pnpm -F web dev",
    "build": "op run --env-file=app/web/.env.template -- pnpm -F web build",
    "build:raw": "pnpm -F web build",
    "test": "pnpm -F web test",
    "verify": "pnpm -F web exec tsc --noEmit && pnpm -F web lint && pnpm format:check && pnpm -F web test:run && pnpm build",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
```

`build` goes through `op run`, so a production build cannot be made without the real values — which is the point, given a missing booking URL would otherwise ship a site with no booking link. `build:raw` exists for the rare case of wanting an unconfigured build to inspect output; it will fail on the `NEXT_PUBLIC_BOOKING_URL` check if `NODE_ENV` is production, which is intended.

Leave `name`, `version`, `private`, `type`, `description`, `engines`, `packageManager`, the `"//"` comment and the existing `devDependencies` exactly as they are. Tooling devDependencies are added by later tasks via `pnpm add -D -w`, which edits this file in place.

Verify nothing was lost:

Run: `node -e "const p=require('./package.json'); console.log(Object.keys(p.scripts).join(' ')); console.log('pin:', p.devDependencies['@playwright/test']); console.log('comment kept:', Boolean(p['//']))"`
Expected: the script list contains `recon capture dev build test verify format format:check`, the pin prints `1.61.0`, and `comment kept: true`.

- [ ] **Step 3: Pin the Node version**

Create `.node-version` containing exactly:

```
24
```

- [ ] **Step 4: Fix .gitignore**

The current file ignores lockfiles, which is correct for throwaway scripts and harmful for a deployed application: without a committed lockfile, every install resolves fresh versions and local and CI builds can differ.

These three lines were added recently by the reference-corpus work and are not yet committed, so removing them reverts an uncommitted change rather than undoing established history.

Remove these two lines:

```
pnpm-lock.yaml
package-lock.json
```

Keep `node_modules/`. Then append:

```
# Next.js build output and static export
app/web/.next/
app/web/out/

# Test artefacts
test-results/
playwright-report/
.playwright/

# Environment values come from 1Password via op run; .env.template is committed.
# A .env.local should never exist in this project, but ignore it if one appears.
.env.local

# Media working directory
.media-work/
```

- [ ] **Step 5: Verify the workspace resolves**

Run: `pnpm install`
Expected: succeeds, creates `pnpm-lock.yaml` at the root, and prints no "No projects matched" warning. `app/*` contains no packages yet, which is fine.

- [ ] **Step 6: Verify the lockfile is now trackable**

Run: `git check-ignore -v pnpm-lock.yaml; echo "exit=$?"`
Expected: `exit=1` and no output — meaning no ignore rule matches it. If a rule is printed, the `.gitignore` edit did not take effect.

- [ ] **Step 7: Commit**

```bash
git add pnpm-workspace.yaml package.json .node-version .gitignore pnpm-lock.yaml
git commit -m "chore(web): pnpm workspace skeleton, commit the lockfile"
```

---

