## Task 5: Lefthook git hooks, verified by actually failing

**Files:**
- Create: `lefthook.yml`
- Modify: `package.json` (root devDependencies and scripts), `pnpm-workspace.yaml`

**Interfaces:**
- Consumes: Tasks 3 and 4.
- Produces: a `pre-commit` hook that formats and lints staged files; a `pre-push` hook that runs the full verification. Adds the root `verify` script.

- [ ] **Step 1: Install Lefthook**

Run: `pnpm add -D -w lefthook@2.1.14`

- [ ] **Step 2: Allow Lefthook's postinstall script**

pnpm blocks dependency build scripts by default, and Lefthook installs its git hooks *from* its postinstall script. Blocked means the hooks silently never exist. Rather than hand-writing a settings key whose name has moved between pnpm versions, let pnpm write it:

Run: `pnpm approve-builds lefthook`

Then confirm it was recorded:

Run: `grep -A3 -iE 'allowBuilds|onlyBuiltDependencies' pnpm-workspace.yaml`
Expected: a block listing `lefthook`. If `approve-builds` was non-interactive and wrote nothing, add manually to `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  lefthook: true
```

- [ ] **Step 3: Reinstall so the hooks actually install**

Run: `pnpm install && test -f .git/hooks/pre-commit && echo "hooks-installed"`
Expected: prints `hooks-installed`. If not, run `pnpm exec lefthook install` and re-check. Do not continue until this prints.

- [ ] **Step 4: Confirm the verify script is already in place**

Task 1 added `verify` when it merged the workspace fields into the root `package.json`. It is not re-added here — two definitions would diverge, and the later one would silently win.

Run: `node -e "const s=require('./package.json').scripts; if(!s.verify) throw new Error('verify script missing — revisit Task 1 Step 2'); if(!s.verify.includes('pnpm build')) throw new Error('verify must call pnpm build so the build goes through op run'); console.log('verify ok:', s.verify)"`

Expected: prints `verify ok:` followed by the full script, which must end in `&& pnpm build` rather than `&& pnpm -F web build` — the former routes through `op run`, the latter bypasses 1Password and would let a production build lacking `NEXT_PUBLIC_BOOKING_URL` proceed.

- [ ] **Step 5: Create the hooks config**

Create `lefthook.yml`:

```yaml
# Fast on commit, strict on push. A 90-second commit trains people into
# --no-verify, after which hooks protect nothing.
pre-commit:
  parallel: true
  commands:
    format:
      glob: '*.{ts,tsx,css,json,md,yml,yaml}'
      run: pnpm prettier --write {staged_files}
      stage_fixed: true
    lint:
      glob: '*.{ts,tsx}'
      run: pnpm eslint --fix --no-warn-ignored {staged_files}
      stage_fixed: true

pre-push:
  parallel: false
  commands:
    typecheck:
      run: pnpm -F web exec tsc --noEmit
      fail_text: 'Type errors. Fix before pushing.'
    lint:
      run: pnpm -F web lint
      fail_text: 'Lint errors. Fix before pushing.'
    format-check:
      run: pnpm format:check
      fail_text: 'Formatting drift. Run: pnpm format'
    test:
      run: pnpm -F web test:run
      fail_text: 'Unit/integration tests failing.'
    build:
      run: pnpm -F web build
      fail_text: 'Production build failed.'
    e2e:
      run: pnpm -F web test:e2e:smoke
      fail_text: 'Smoke tests failing.'
```

- [ ] **Step 6: Prove the pre-commit hook reformats a bad file**

This pins Review Focus item 2. A hook that never installed looks exactly like a hook that passed, so the only trustworthy check is making it do something visible.

```bash
printf 'export const probe  =   {a:1,   b:2}\n' > app/web/src/__hookprobe.ts
git add app/web/src/__hookprobe.ts
git commit -m "test: hook probe" --no-verify=false
git show --stat HEAD | head -5
cat app/web/src/__hookprobe.ts
```

Expected: the committed file is reformatted to Prettier style (single quotes, no double spaces, no semicolon). If it is byte-identical to what was written, the hook did not run — return to Step 3.

- [ ] **Step 7: Remove the probe and amend it away**

```bash
git rm app/web/src/__hookprobe.ts
git commit --amend -m "chore(web): Lefthook hooks, fast pre-commit and strict pre-push"
```

- [ ] **Step 8: Commit the config**

```bash
git add lefthook.yml package.json pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "chore(web): pre-push verification gate"
```

---

