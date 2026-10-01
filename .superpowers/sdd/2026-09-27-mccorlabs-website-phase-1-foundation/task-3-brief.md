## Task 3: Prettier at the repository root

**Files:**
- Create: `prettier.config.ts`, `.prettierignore`
- Modify: `package.json` (root devDependencies)

**Interfaces:**
- Consumes: Task 1's root package.
- Produces: `pnpm format` and `pnpm format:check` covering the whole repo; Tailwind class sorting available to later tasks.

- [ ] **Step 1: Install Prettier and the Tailwind plugin at the root**

Prettier lives at the root because the pre-commit hook runs from the root against staged paths anywhere in the tree.

Run: `pnpm add -D -w prettier@3.9.9 prettier-plugin-tailwindcss@^0.8.1`

- [ ] **Step 2: Create the Prettier config**

Create `prettier.config.ts`:

```ts
import type { Config } from 'prettier'

const config: Config = {
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 90,
  // prettier-plugin-tailwindcss uses Prettier APIs only one plugin may hold,
  // so it must be listed last. Import ordering is handled by ESLint instead,
  // to avoid loading a second plugin that would conflict with it.
  plugins: ['prettier-plugin-tailwindcss'],
  // Tailwind v4 has no JS config file; the plugin needs the CSS entry point.
  // `tailwindConfig` is the v3 option and does nothing here.
  tailwindStylesheet: './app/web/src/styles/globals.css',
}

export default config
```

- [ ] **Step 3: Create the Prettier ignore file**

Create `.prettierignore`:

```
node_modules/
pnpm-lock.yaml
app/web/.next/
app/web/out/
test-results/
playwright-report/
docs/ui-references/
infra/
.media-work/
```

`infra/` and `docs/ui-references/` are excluded because they are owned elsewhere and must not be reformatted by this work.

- [ ] **Step 4: Verify Prettier runs and its TS config loads**

Run: `pnpm format:check`
Expected: either "All matched files use Prettier code style!" or a list of files needing formatting. A crash mentioning the config file means Node is below 22.6 or the TS config is not being read — check `node -v`.

- [ ] **Step 5: Format the repo and confirm idempotence**

Run: `pnpm format && pnpm format:check`
Expected: the second command reports all files formatted. Note `tailwindStylesheet` points at a file that does not exist until Task 6; the plugin tolerates this and simply does not sort classes yet.

- [ ] **Step 6: Commit**

```bash
git add prettier.config.ts .prettierignore package.json pnpm-lock.yaml
git add -A
git commit -m "chore(web): Prettier at the workspace root with Tailwind class sorting"
```

---

