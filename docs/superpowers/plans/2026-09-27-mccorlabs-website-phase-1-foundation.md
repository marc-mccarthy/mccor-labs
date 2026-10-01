# McCor Labs Website — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the pnpm workspace, tooling, design tokens, layout shell and ten route skeletons for the McCor Labs website, verified entirely locally with nothing deployed.

**Architecture:** A pnpm workspace at the repository root holds shared tooling (Prettier, ESLint, Lefthook) and a single site package at `app/web` named `web`. The site is Next.js 16 App Router in static-export mode, styled with Tailwind v4 tokens defined in CSS, with all copy in a typed content layer. Phase 1 builds the skeleton and the safety net; phases 2–4 add content, effects and deployment.

**Tech Stack:** Next.js 16.3.6, React 19.3.0, TypeScript 5.x strict, Tailwind CSS 4.3.3, shadcn/ui, Vitest 5, Playwright 1.61.0 (pinned exactly — browser-revision constraint), ESLint 10 + typescript-eslint 8, Prettier 3.9.9, Lefthook 2.1.14, pnpm 12.

**Spec:** `docs/superpowers/specs/2026-09-27-mccorlabs-website-design.md`

## Global Constraints

1. **`infra/` is off limits.** Never create, edit or delete any file under `infra/`. Reading it is permitted.
2. **TypeScript only.** No `.js` or `.jsx` in `app/web/src/`. Config files are `.ts` where the tool supports it.
3. **pnpm only.** Never `npm install` or `yarn`.
4. **`app/web/package.json` must set `"name": "web"`.** Every script in this plan uses `pnpm -F web`, which filters on the package `name` field, not the directory.
5. **Static export.** `output: 'export'`, `trailingSlash: true`, `images.unoptimized: true`. No Route Handlers, no Server Actions, no middleware.
6. **Tokens only — no raw colour values in any component.** Only `var(--color-*)` or the Tailwind utility generated from a token.
7. **Nothing is deployed in phase 1.** No `aws` command runs. No CloudFront, no S3.
8. **Do not commit unless the step says to.** Each task ends with one commit. The owner creates all other commits.
9. **Exact versions:** `next@16.3.6`, `react@19.3.0`, `react-dom@19.3.0`, `tailwindcss@4.3.3`, `prettier@3.9.9`, `lefthook@2.1.14`.
10. **Local green does not prove production works.** Route resolution and 404 status cannot be verified locally; that is phase 4. Never report phase 1 as "the site works" — only as "builds and passes locally".
11. **Never run `playwright install`.** `@playwright/test@1.61.0` is pinned at the repo root to match the already-cached `chromium-1228`. The disk is at 89% capacity; an unnecessary browser download costs ~500MB for nothing. Never widen that pin to a caret range.
12. **Environment values come from 1Password**, vault `Development`, item `mccor-labs`, via `op run --env-file=app/web/.env.template`. `.env.template` is committed because `op://` references are pointers, not secrets. Never create a `.env.local`, and never hardcode a value the template references.

## Review Focus

These are the five things most likely to break for a real person, that no obvious task would otherwise test. Each has a test pinned to the task that owns it.

1. **`pnpm -F web <script>` silently matches nothing** if `app/web/package.json` has any name other than `web`, and pnpm exits 0 with "No projects matched the filters" — so every hook and script appears to pass while doing nothing. Tested in Task 2, Step 10.
2. **Lefthook's hooks never install**, because pnpm blocks postinstall scripts by default. A missing hook is indistinguishable from a passing hook. Tested in Task 5, Steps 4–7 by making a real bad commit attempt.
3. **The static export does not produce the file shape the deploy expects** — a missing `out/services/index.html` or a missing `out/404.html` means a broken route in production that nothing local reveals. Tested in Task 9, Step 11.
4. **The contact form renders a dead button** when `NEXT_PUBLIC_CONTACT_ENDPOINT` is unset, submitting into the void. Tested in Task 11, Steps 5 and 8.
5. **A colour token drifts below its WCAG threshold** during a later redesign, silently failing accessibility. Tested in Task 6, Step 3, which recomputes every ratio from the CSS itself.
6. **A caret-ranged Playwright floats to a version wanting a newer browser revision**, triggering a ~500MB download on a volume at 89% capacity and leaving two Playwright versions in one repo. Tested in Task 12, Step 1, which asserts the version is exactly 1.61.0 and refuses to install a browser.
7. **A production build made without 1Password ships a site with no booking link**, because the CTA degrades to email silently and no test would notice. Tested in Task 7, by the env test asserting a production build throws when `NEXT_PUBLIC_BOOKING_URL` is absent.

---

## File Structure

**Repository root — created or modified**

| File                  | Responsibility                                                                    |
| --------------------- | --------------------------------------------------------------------------------- |
| `pnpm-workspace.yaml` | Declares `app/*` as packages. Holds the lefthook build allow-list.                |
| `package.json`        | Private root. Workspace scripts and shared devDependencies only. No runtime deps. |
| `.gitignore`          | Modified: stop ignoring lockfiles; add build and test artefacts.                  |
| `.node-version`       | Pins Node 24.                                                                     |
| `prettier.config.ts`  | Formatting, with Tailwind class sorting.                                          |
| `eslint.config.ts`    | Flat config covering the whole workspace.                                         |
| `lefthook.yml`        | Fast pre-commit, strict pre-push.                                                 |
| `README.md`           | Modified: website development and deployment sections.                            |

**`app/web` — the site**

| File                                      | Responsibility                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| `package.json`                            | Name `web`. Site dependencies and scripts.                                     |
| `next.config.ts`                          | Static export configuration.                                                   |
| `tsconfig.json`                           | Strict TypeScript.                                                             |
| `vitest.config.ts`                        | Unit test runner, jsdom, React plugin.                                         |
| `playwright.config.ts`                    | E2E against the exported build.                                                |
| `src/styles/globals.css`                  | Tailwind import and `@theme` design tokens. The single source of colour truth. |
| `src/content/types.ts`                    | Types for all content.                                                         |
| `src/content/site.ts`                     | Site name, tagline, booking URL, contact address, budget options.              |
| `src/content/nav.ts`                      | Navigation and footer link structure.                                          |
| `src/content/ui.ts`                       | Accessible names and UI strings a visitor reads.                               |
| `src/lib/cn.ts`                           | Class name merge helper.                                                       |
| `src/lib/env.ts`                          | Parses and validates public environment variables.                             |
| `src/lib/contact.ts`                      | Contact request/response types and the submit client.                          |
| `src/components/ui/button.tsx`            | shadcn Button primitive.                                                       |
| `src/components/layout/*`                 | `Header`, `Footer`, `Container`, `Section`, `SkipLink`, `BookingCta`.          |
| `src/components/sections/PageHeader.tsx`  | Shared route heading block, so every route has exactly one `h1`.               |
| `src/components/contact/ContactForm.tsx`  | The form, against the mock in phase 1.                                         |
| `src/app/layout.tsx`                      | Root layout, metadata, theme attribute, skip link, header, footer.             |
| `src/app/page.tsx` + nine route files     | Route skeletons.                                                               |
| `src/app/not-found.tsx`                   | 404, exported to `out/404.html`.                                               |
| `src/app/sitemap.ts`, `src/app/robots.ts` | SEO files, driven by `env.ts`.                                                 |
| `src/test/setup.ts`                       | Vitest DOM matchers.                                                           |
| `tests/e2e/*.spec.ts`                     | Route, accessibility, contact and smoke tests.                                 |

---

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

## Task 2: Next.js site package at app/web

**Files:**

- Create: `app/web/package.json`, `app/web/next.config.ts`, `app/web/tsconfig.json`, `app/web/next-env.d.ts`
- Create: `app/web/vitest.config.ts`, `app/web/src/test/setup.ts`
- Delete: `app/web/index.html`, `app/web/app.js`
- Test: `app/web/tests/workspace.test.ts`

**Interfaces:**

- Consumes: the workspace from Task 1.
- Produces: a package named `web` resolvable as `pnpm -F web`; `@/*` path alias mapping to `app/web/src/*`; a static-export Next config.

- [ ] **Step 1: Remove the placeholder files**

`app/web` currently holds a placeholder page and client script that the real site replaces.

```bash
git rm app/web/index.html app/web/app.js
```

- [ ] **Step 2: Create the site package.json**

Create `app/web/package.json`. The `name` field is load-bearing — `pnpm -F web` matches on it:

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test -c playwright.config.ts",
    "test:e2e:smoke": "playwright test -c playwright.config.ts --grep @smoke",
    "test:a11y": "playwright test -c playwright.config.ts tests/e2e/a11y.spec.ts"
  },
  "dependencies": {
    "next": "16.3.6",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@testing-library/dom": "^11",
    "@testing-library/jest-dom": "^6",
    "@testing-library/react": "^17",
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^5",
    "jsdom": "^27",
    "typescript": "^5",
    "vite-tsconfig-paths": "^5",
    "vitest": "^5"
  }
}
```

These resolve the root-installed `playwright` binary through the workspace's shared `node_modules/.bin`, so no per-package install is needed.

- [ ] **Step 3: Create the Next config**

Create `app/web/next.config.ts`:

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Static export: the build writes plain HTML to out/ for S3 + CloudFront.
  output: 'export',
  // Produces out/services/index.html rather than out/services.html, so a
  // directory-style URL can resolve once the CloudFront rewrite lands.
  trailingSlash: true,
  // No runtime image optimizer exists in a static export; a build-time sharp
  // pipeline handles this in phase 2.
  images: { unoptimized: true },
  reactStrictMode: true,
}

export default nextConfig
```

- [ ] **Step 4: Create the TypeScript config**

Create `app/web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "out", ".next"]
}
```

- [ ] **Step 5: Install**

Run: `pnpm install`
Expected: installs Next, React and types under `app/web`. Lockfile updates.

- [ ] **Step 6: Create the Vitest config**

Create `app/web/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    // Playwright owns tests/e2e; Vitest must not try to run them.
    exclude: ['node_modules', 'out', '.next', 'tests/e2e/**'],
  },
})
```

- [ ] **Step 7: Create the test setup file**

Create `app/web/src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 8: Verify the test runner starts**

Run: `pnpm -F web test:run`
Expected: exits 0 reporting "No test files found" — the runner works and there is nothing to run yet.

- [ ] **Step 9: Write the failing workspace-resolution test**

This test pins Review Focus item 1. Create `app/web/tests/workspace.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('workspace wiring', () => {
  it('names the site package "web" so pnpm -F web resolves', () => {
    const pkg = JSON.parse(
      readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8'),
    ) as { name: string }
    expect(pkg.name).toBe('web')
  })

  it('configures static export with trailing slashes', () => {
    const config = readFileSync(join(import.meta.dirname, '..', 'next.config.ts'), 'utf8')
    expect(config).toMatch(/output:\s*'export'/)
    expect(config).toMatch(/trailingSlash:\s*true/)
    expect(config).toMatch(/unoptimized:\s*true/)
  })
})
```

- [ ] **Step 10: Verify the filter works from the root**

The test above checks the file; this checks pnpm's actual behaviour, which is the thing that silently fails.

Run: `pnpm -F web exec node -e "console.log('filter-ok')"`
Expected: prints `filter-ok`. If it prints "No projects matched the filters" the `name` field is wrong — pnpm exits 0 either way, which is exactly why this check exists.

- [ ] **Step 11: Commit**

```bash
git add app/web package.json pnpm-lock.yaml
git commit -m "feat(web): Next.js 16 site package configured for static export"
```

---

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

## Task 4: ESLint flat config at the repository root

**Files:**

- Create: `eslint.config.ts`
- Modify: `package.json` (root devDependencies)

**Interfaces:**

- Consumes: Tasks 2 and 3.
- Produces: `pnpm -F web lint`; the four project-specific rules that enforce the spec's architecture.

- [ ] **Step 1: Install ESLint and its plugins at the root**

`next lint` was removed in Next.js 16, so ESLint is invoked directly. `jiti` is required for ESLint to load a TypeScript config file.

Run:

```bash
pnpm add -D -w eslint@^10 typescript-eslint@^8.70.1 eslint-config-next@16.3.6 \
  eslint-plugin-jsx-a11y@^6 eslint-config-prettier@^10.1.8 jiti@^2
```

- [ ] **Step 2: Create the flat config**

Create `eslint.config.ts`:

```ts
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import prettierConfig from 'eslint-config-prettier/flat'

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      'app/web/.next/**',
      'app/web/out/**',
      'infra/**',
      'docs/ui-references/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },

  ...compat.extends('next/core-web-vitals'),

  {
    files: ['app/web/**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: 'app/web',
      },
    },
  },

  {
    files: ['app/web/**/*.tsx'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: { ...jsxA11y.flatConfigs.recommended.rules },
  },

  // Project rules that enforce the spec's architecture.
  {
    files: ['app/web/src/**/*.tsx'],
    ignores: ['app/web/src/styles/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b|rgba?\\(|hsla?\\(|oklch\\(/]',
          message:
            'No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css.',
        },
      ],
    },
  },

  {
    files: ['app/web/src/**/*.{ts,tsx}'],
    ignores: ['app/web/src/components/motion/**', 'app/web/src/components/effects/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'motion',
              message:
                'Import Motion only inside components/motion or components/effects. Elsewhere, use the motion primitives.',
            },
            {
              name: 'motion/react',
              message:
                'Import Motion only inside components/motion or components/effects. Elsewhere, use the motion primitives.',
            },
          ],
          patterns: [
            {
              group: ['**/components/effects/*'],
              message:
                'Effects must be loaded with next/dynamic so no page pays for an effect it does not render.',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['app/web/src/content/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/components/**', '@/components/**'],
              message:
                'Content must not import components. Content is data; components consume it.',
            },
          ],
        },
      ],
    },
  },

  // Tests need latitude the application code does not.
  {
    files: ['app/web/**/*.{test,spec}.{ts,tsx}', 'app/web/tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      'no-restricted-syntax': 'off',
    },
  },

  // Must be last so formatting rules do not fight Prettier.
  prettierConfig,
)
```

- [ ] **Step 3: Install the compat package ESLint's Next config needs**

Run: `pnpm add -D -w @eslint/eslintrc@^3`

- [ ] **Step 4: Verify the lint run succeeds**

Run: `pnpm -F web lint`
Expected: exits 0 with no errors. There is almost no source yet, so any error here is a config problem. If ESLint reports it cannot read `eslint.config.ts`, confirm `jiti` installed.

- [ ] **Step 5: Verify the colour rule actually fires**

A rule that never fires is worse than no rule, because it creates false confidence.

```bash
mkdir -p app/web/src/components/layout
cat > app/web/src/components/layout/__ruleprobe.tsx <<'TSX'
export function Probe() {
  return <div style={{ color: '#ff0000' }} />
}
TSX
pnpm -F web lint; echo "exit=$?"
```

Expected: a `no-restricted-syntax` error naming the colour rule, and `exit=1`.

- [ ] **Step 6: Remove the probe**

```bash
rm app/web/src/components/layout/__ruleprobe.tsx
pnpm -F web lint
```

Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add eslint.config.ts package.json pnpm-lock.yaml
git commit -m "chore(web): ESLint flat config with architecture rules"
```

---

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

pnpm blocks dependency build scripts by default, and Lefthook installs its git hooks _from_ its postinstall script. Blocked means the hooks silently never exist. Rather than hand-writing a settings key whose name has moved between pnpm versions, let pnpm write it:

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

## Task 6: Tailwind v4 and the design tokens, with contrast measured in a test

**Files:**

- Create: `app/web/src/styles/globals.css`, `app/web/src/lib/cn.ts`, `app/web/src/styles/tokens.test.ts`
- Create: `app/web/postcss.config.mjs`
- Modify: `app/web/package.json`

**Interfaces:**

- Consumes: Task 2.
- Produces: every colour token as a CSS custom property and a Tailwind utility; `cn()` for class merging.

- [ ] **Step 1: Install Tailwind v4 and helpers**

Run:

```bash
pnpm -F web add -D tailwindcss@4.3.3 @tailwindcss/postcss@4.3.3
pnpm -F web add clsx tailwind-merge
```

- [ ] **Step 2: Create the PostCSS config**

Create `app/web/postcss.config.mjs`:

```js
const config = { plugins: { '@tailwindcss/postcss': {} } }
export default config
```

- [ ] **Step 3: Write the failing contrast test**

This pins Review Focus item 5. It parses the real CSS rather than a duplicated copy of the values, so the test cannot drift from what ships.

Create `app/web/src/styles/tokens.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function tokens(): Record<string, string> {
  const css = readFileSync(join(import.meta.dirname, 'globals.css'), 'utf8')
  const out: Record<string, string> = {}
  for (const match of css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    out[match[1]!] = match[2]!.toLowerCase()
  }
  return out
}

function channel(value: number): number {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  )
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

// Every pair the spec commits to, with its required ratio.
const PAIRS: ReadonlyArray<[string, string, number, string]> = [
  ['text', 'base', 4.5, 'body text on page'],
  ['text', 'surface', 4.5, 'text on card'],
  ['text', 'elevated', 4.5, 'text on raised surface'],
  ['muted', 'base', 4.5, 'secondary text on page'],
  ['muted', 'surface', 4.5, 'secondary text on card'],
  ['accent', 'base', 4.5, 'link on page'],
  ['accent', 'surface', 4.5, 'link on card'],
  ['base', 'accent', 4.5, 'dark label on accent button'],
  ['brand', 'base', 3.0, 'brand as large display type'],
  ['border-strong', 'base', 3.0, 'control border on page'],
  ['border-strong', 'surface', 3.0, 'control border on card'],
  ['accent', 'base', 3.0, 'focus ring on page'],
]

describe('design tokens', () => {
  it('defines every token the components rely on', () => {
    const t = tokens()
    for (const name of [
      'base',
      'surface',
      'elevated',
      'border',
      'border-strong',
      'muted',
      'text',
      'brand',
      'accent',
    ]) {
      expect(t[name], `--color-${name} is missing from globals.css`).toMatch(
        /^#[0-9a-f]{6}$/,
      )
    }
  })

  it.each(PAIRS)('%s on %s meets %s:1 (%s)', (fg, bg, required, _label) => {
    const t = tokens()
    const ratio = contrast(t[fg]!, t[bg]!)
    expect(ratio).toBeGreaterThanOrEqual(required)
  })

  it('keeps the decorative border decorative, not a control border', () => {
    const t = tokens()
    // --color-border is intentionally low contrast (a hairline). If someone
    // raises it to control-border levels, --color-border-strong has become
    // redundant and the distinction has been lost.
    expect(contrast(t['border']!, t['base']!)).toBeLessThan(3)
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm -F web exec vitest run src/styles/tokens.test.ts`
Expected: FAIL — `globals.css` does not exist yet.

- [ ] **Step 5: Create the stylesheet and tokens**

Create `app/web/src/styles/globals.css`:

```css
@import 'tailwindcss';

/* The single source of colour truth. Every ratio here is verified by
   src/styles/tokens.test.ts against WCAG 2.2 thresholds. Do not change a
   value without running that test. */
@theme {
  --color-base: #070a12;
  --color-surface: #0d121d;
  --color-elevated: #151c2b;
  /* Decorative hairline only — 1.29:1. Never use for an input or control. */
  --color-border: #1d2534;
  /* Control and input borders — 3.47:1 on base. */
  --color-border-strong: #5a6780;
  --color-muted: #8a94a6;
  --color-text: #eef2f8;
  /* Large display type and non-text graphics only: 4.47:1 fails AA for body
     text by 0.03. Use --color-accent for anything small or interactive. */
  --color-brand: #3d6bff;
  /* Links, small text, button fill, focus rings — 5.31:1 on base. */
  --color-accent: #527bff;

  --color-glow-violet: #7c5cff;
  --color-glow-cyan: #22d3ee;
}

:root {
  color-scheme: dark;
}

@layer base {
  * {
    min-width: 0;
  }

  html {
    -webkit-text-size-adjust: 100%;
  }

  body {
    background-color: var(--color-base);
    color: var(--color-text);
    -webkit-font-smoothing: antialiased;
  }

  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

- [ ] **Step 6: Create the class-merge helper**

Create `app/web/src/lib/cn.ts`:

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm -F web exec vitest run src/styles/tokens.test.ts`
Expected: PASS — all 12 contrast pairs plus the two structural assertions.

- [ ] **Step 8: Commit**

```bash
git add app/web/src/styles app/web/src/lib/cn.ts app/web/postcss.config.mjs app/web/package.json pnpm-lock.yaml
git commit -m "feat(web): design tokens with contrast verified in a test"
```

---

## Task 7: Typed content layer and environment parsing

**Files:**

- Create: `app/web/src/content/types.ts`, `site.ts`, `nav.ts`, `ui.ts`, `content.test.ts`
- Create: `app/web/src/lib/env.ts`, `app/web/src/lib/env.test.ts`
- Create: `app/web/.env.template`

**Interfaces:**

- Consumes: Task 2.
- Produces: `site`, `nav`, `footerNav`, `ui` exports; `Service`, `TeamMember`, `ProcessStage`, `NavItem` types; `env` with `siteUrl` and `contactEndpoint`.

- [ ] **Step 1: Write the failing content test**

Create `app/web/src/content/content.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { site } from './site'
import { footerNav, nav } from './nav'
import { ui } from './ui'

describe('site content', () => {
  it('has a name and tagline', () => {
    expect(site.name).toBe('McCor Labs')
    expect(site.tagline).toContain('websites, applications and AI features')
  })

  it('has a contact mailbox on the firm domain', () => {
    expect(site.contactEmail).toMatch(/@mccorlabs\.com$/)
  })

  it('offers budget options for the contact form', () => {
    expect(site.budgetOptions.length).toBeGreaterThanOrEqual(3)
    expect(new Set(site.budgetOptions).size).toBe(site.budgetOptions.length)
  })
})

describe('navigation', () => {
  it('links only to internal routes with trailing slashes', () => {
    for (const item of [...nav, ...footerNav]) {
      expect(item.href, `${item.label} must be a rooted path`).toMatch(/^\/$|^\/.+\/$/)
      expect(item.label.length).toBeGreaterThan(0)
    }
  })

  it('has no duplicate destinations in the main nav', () => {
    const hrefs = nav.map((n) => n.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})

describe('ui strings', () => {
  it('provides every accessible name a component needs', () => {
    for (const key of ['skipToContent', 'openMenu', 'closeMenu', 'bookCall'] as const) {
      expect(ui[key], `ui.${key} is missing`).toBeTruthy()
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm -F web exec vitest run src/content`
Expected: FAIL — cannot resolve `./site`.

- [ ] **Step 3: Create the content types**

Create `app/web/src/content/types.ts`:

```ts
export type NavItem = {
  label: string
  href: string
}

export type Service = {
  slug: string
  title: string
  summary: string
  detail: string
  deliverables: readonly string[]
}

export type TeamMember = {
  slug: string
  name: string
  role: string
  bio: string
  /** Media slot id resolved through the media manifest, or null for a
   *  non-photographic treatment. */
  mediaSlot: string | null
  links?: readonly { label: string; href: string }[]
}

export type ProcessStage = {
  index: number
  title: string
  summary: string
  duration: string
}
```

- [ ] **Step 4: Create the site content**

`contactEmail` is the admin mailbox from `infra/settings.auto.tfvars`, so it is a real value. The booking URL is no longer here — it moved to `NEXT_PUBLIC_BOOKING_URL` so a preview environment can point at a throwaway calendar. Never substitute a plausible-looking URL for a missing one anywhere: a dead primary CTA passes review unnoticed.

Create `app/web/src/content/site.ts`:

```ts
export const site = {
  name: 'McCor Labs',
  tagline:
    'A small senior team building websites, applications and AI features for companies that need them to actually work.',
  // Booking URL now lives in NEXT_PUBLIC_BOOKING_URL — see src/lib/env.ts.
  // The admin mailbox from infra/settings.auto.tfvars.
  contactEmail: 'marcm@mccorlabs.com',
  budgetOptions: ['Under $10k', '$10k – $25k', '$25k – $50k', '$50k+', 'Not sure yet'],
} as const
```

- [ ] **Step 5: Create the navigation**

Create `app/web/src/content/nav.ts`:

```ts
import type { NavItem } from './types'

/** Primary header navigation. Trailing slashes match next.config trailingSlash. */
export const nav: readonly NavItem[] = [
  { label: 'Services', href: '/services/' },
  { label: 'Work', href: '/work/' },
  { label: 'Process', href: '/process/' },
  { label: 'About', href: '/about/' },
  { label: 'Contact', href: '/contact/' },
]

/** Footer navigation, including the routes kept out of the header. */
export const footerNav: readonly NavItem[] = [
  ...nav,
  { label: 'Careers', href: '/careers/' },
  { label: 'Privacy', href: '/privacy/' },
  { label: 'Terms', href: '/terms/' },
]
```

- [ ] **Step 6: Create the UI strings**

Create `app/web/src/content/ui.ts`:

```ts
/** Strings a visitor reads, including accessible names. Copy lives in
 *  content; structural ARIA attributes stay inline in components. */
export const ui = {
  skipToContent: 'Skip to content',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  bookCall: 'Book a 30-minute call',
  contactFallback: 'Email us directly',
  formSubmit: 'Send message',
  formSending: 'Sending…',
  formSuccess: 'Thanks — we will reply within one working day.',
  formErrorValidation:
    'Something was wrong with that submission. Please check and retry.',
  formErrorRateLimit: 'Too many attempts. Please wait a minute and try again.',
  formErrorServer: 'We could not send that. Please email us instead.',
  footerRights: 'All rights reserved.',
} as const
```

- [ ] **Step 7: Run the content test to verify it passes**

Run: `pnpm -F web exec vitest run src/content`
Expected: PASS.

- [ ] **Step 8: Write the failing env test**

Create `app/web/src/lib/env.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadEnv(values: Record<string, string | undefined>) {
  vi.resetModules()
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  return (await import('./env')).env
}

afterEach(() => {
  delete process.env['NEXT_PUBLIC_SITE_URL']
  delete process.env['NEXT_PUBLIC_CONTACT_ENDPOINT']
  delete process.env['NEXT_PUBLIC_BOOKING_URL']
  process.env['NODE_ENV'] = 'test'
})

describe('env', () => {
  it('defaults the site url to production', async () => {
    const env = await loadEnv({ NEXT_PUBLIC_SITE_URL: undefined })
    expect(env.siteUrl).toBe('https://mccorlabs.com')
  })

  it('accepts an override for preview environments', async () => {
    const env = await loadEnv({ NEXT_PUBLIC_SITE_URL: 'https://mm.mccorlabs.com' })
    expect(env.siteUrl).toBe('https://mm.mccorlabs.com')
  })

  it('rejects a malformed site url at build time', async () => {
    await expect(loadEnv({ NEXT_PUBLIC_SITE_URL: 'not-a-url' })).rejects.toThrow(
      /NEXT_PUBLIC_SITE_URL/,
    )
  })

  it('treats a missing contact endpoint as null rather than failing', async () => {
    const env = await loadEnv({ NEXT_PUBLIC_CONTACT_ENDPOINT: undefined })
    expect(env.contactEndpoint).toBeNull()
  })

  it('allows a missing booking url in development so dev works without 1Password', async () => {
    const env = await loadEnv({
      NEXT_PUBLIC_BOOKING_URL: undefined,
      NODE_ENV: 'development',
    })
    expect(env.bookingUrl).toBeNull()
  })

  it('fails a production build when the booking url is missing', async () => {
    await expect(
      loadEnv({ NEXT_PUBLIC_BOOKING_URL: undefined, NODE_ENV: 'production' }),
    ).rejects.toThrow(/NEXT_PUBLIC_BOOKING_URL is required/)
  })

  it('accepts a google calendar appointment schedule url', async () => {
    const env = await loadEnv({
      NEXT_PUBLIC_BOOKING_URL: 'https://calendar.app.google/EXAMPLE',
    })
    expect(env.bookingUrl).toBe('https://calendar.app.google/EXAMPLE')
  })

  it('strips a trailing slash from the site url so joins do not double up', async () => {
    const env = await loadEnv({ NEXT_PUBLIC_SITE_URL: 'https://mccorlabs.com/' })
    expect(env.siteUrl).toBe('https://mccorlabs.com')
  })
})
```

- [ ] **Step 9: Run it to verify it fails**

Run: `pnpm -F web exec vitest run src/lib/env.test.ts`
Expected: FAIL — cannot resolve `./env`.

- [ ] **Step 10: Create the env module**

Create `app/web/src/lib/env.ts`:

```ts
function requireUrl(name: string, raw: string | undefined, fallback: string): string {
  const value = raw ?? fallback
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${name} must be an absolute URL, received: ${value}`)
  }
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw new Error(`${name} must use https, received: ${value}`)
  }
  return value.replace(/\/+$/, '')
}

function optionalUrl(name: string, raw: string | undefined): string | null {
  if (raw === undefined || raw === '') return null
  try {
    new URL(raw)
  } catch {
    throw new Error(`${name} must be an absolute URL when set, received: ${raw}`)
  }
  return raw
}

/**
 * Optional in development, mandatory in a production build. Fails the build
 * rather than allowing a silent degradation that nobody would notice.
 */
function requiredInProduction(name: string, raw: string | undefined): string | null {
  const value = optionalUrl(name, raw)
  if (value === null && process.env['NODE_ENV'] === 'production') {
    throw new Error(
      `${name} is required for a production build. Run the build through ` +
        '`op run --env-file=.env.template -- …` so 1Password supplies it.',
    )
  }
  return value
}

/** Public configuration, inlined at build time by the static export. */
export const env = {
  siteUrl: requireUrl(
    'NEXT_PUBLIC_SITE_URL',
    process.env['NEXT_PUBLIC_SITE_URL'],
    'https://mccorlabs.com',
  ),
  /**
   * Booking destination — a Google Calendar appointment schedule or Cal.com URL.
   * Required for a production build: without it the primary CTA silently falls
   * back to email, which would ship a site with no booking link and nothing to
   * catch it. Optional in development so `pnpm dev` works without 1Password.
   */
  bookingUrl: requiredInProduction(
    'NEXT_PUBLIC_BOOKING_URL',
    process.env['NEXT_PUBLIC_BOOKING_URL'],
  ),
  /** null means no endpoint is provisioned yet; the form degrades to email. */
  contactEndpoint: optionalUrl(
    'NEXT_PUBLIC_CONTACT_ENDPOINT',
    process.env['NEXT_PUBLIC_CONTACT_ENDPOINT'],
  ),
} as const
```

- [ ] **Step 11: Create the 1Password environment template**

Values live in 1Password, in the `Development` vault under an item named `mccor-labs`. This file holds `op://` _references_, not values — references are pointers and contain nothing secret, so this file is committed. There is no `.env.local` in this project.

Create `app/web/.env.template`:

```
# Resolved by `op run`. These are references, not values — safe to commit.
# Vault: Development · Item: mccor-labs
NEXT_PUBLIC_SITE_URL=op://Development/mccor-labs/site_url
NEXT_PUBLIC_BOOKING_URL=op://Development/mccor-labs/booking_url
NEXT_PUBLIC_CONTACT_ENDPOINT=op://Development/mccor-labs/contact_endpoint
```

The item must have fields `site_url`, `booking_url` and `contact_endpoint`. `contact_endpoint` may be empty until the owner provisions the API Gateway route; an empty value is treated the same as unset.

These are the only environment variables the site reads. `src/lib/env.ts` parses and
validates all of them at module load, so a malformed value fails the build rather than
producing a broken page. A static export inlines them at build time, which is why every
one is `NEXT_PUBLIC_` — none of them are secret, and none can be.

| Variable                       | Required | Purpose                                                                                                                                                                                               |
| ------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`         | yes      | Absolute base URL for `sitemap.ts`, `robots.ts`, canonical tags and Open Graph. Defaults to `https://mccorlabs.com`. Must be overridable so a preview environment does not advertise production URLs. |
| `NEXT_PUBLIC_BOOKING_URL`      | no       | Booking destination for the primary CTA. Unset ⇒ the CTA falls back to `site.contactEmail`. Point preview environments at a throwaway calendar rather than the real one.                              |
| `NEXT_PUBLIC_CONTACT_ENDPOINT` | no       | Absolute URL of the contact endpoint on API Gateway. Unset ⇒ the form renders the booking link and an email address instead of a button that fails silently.                                          |

All three are `NEXT_PUBLIC_`, so a static export compiles them into the published HTML. **None of them is secret and none can be.** 1Password is the single source of truth here so a new machine or a teammate gets correct values without guessing — not a secrecy mechanism.

- [ ] **Step 12: Run the env test to verify it passes**

Run: `pnpm -F web exec vitest run src/lib/env.test.ts`
Expected: PASS — all eight cases.

- [ ] **Step 13: Commit**

```bash
git add app/web/src/content app/web/src/lib/env.ts app/web/src/lib/env.test.ts app/web/.env.template
git commit -m "feat(web): typed content layer and validated public env"
```

---

## Task 8: shadcn/ui Button primitive

**Files:**

- Create: `app/web/components.json`, `app/web/src/components/ui/button.tsx`, `app/web/src/components/ui/button.test.tsx`
- Modify: `app/web/package.json`

**Interfaces:**

- Consumes: Tasks 2 and 6.
- Produces: `<Button variant asChild>`; `buttonVariants()` for link styling.

- [ ] **Step 1: Install the primitives shadcn's Button needs**

Run: `pnpm -F web add class-variance-authority @radix-ui/react-slot`

- [ ] **Step 2: Create the shadcn config**

Created by hand rather than via `shadcn init`, because the CLI would rewrite `globals.css` and replace the measured tokens from Task 6.

Create `app/web/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/cn",
    "ui": "@/components/ui"
  }
}
```

- [ ] **Step 3: Write the failing Button test**

Create `app/web/src/components/ui/button.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Book a call</Button>)
    expect(screen.getByRole('button', { name: 'Book a call' })).toBeInTheDocument()
  })

  it('renders as a link when asChild is set, so CTAs can navigate', () => {
    render(
      <Button asChild>
        <a href="/contact/">Contact</a>
      </Button>,
    )
    const link = screen.getByRole('link', { name: 'Contact' })
    expect(link).toHaveAttribute('href', '/contact/')
  })

  it('exposes the disabled state to assistive technology', () => {
    render(<Button disabled>Sending</Button>)
    expect(screen.getByRole('button', { name: 'Sending' })).toBeDisabled()
  })
})
```

- [ ] **Step 4: Run it to verify it fails**

Run: `pnpm -F web exec vitest run src/components/ui`
Expected: FAIL — cannot resolve `./button`.

- [ ] **Step 5: Create the Button**

Colours reference tokens only, so the ESLint colour rule stays satisfied.

Create `app/web/src/components/ui/button.tsx`:

```tsx
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Dark label on the accent fill: 5.31:1.
        primary: 'bg-accent text-base hover:bg-brand',
        secondary: 'bg-surface text-text border border-border-strong hover:bg-elevated',
        ghost: 'text-text hover:bg-surface',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-4',
        md: 'h-11 px-6',
        lg: 'h-13 px-8 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  return (
    <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
}

export { buttonVariants }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm -F web exec vitest run src/components/ui`
Expected: PASS — all three cases.

- [ ] **Step 7: Commit**

```bash
git add app/web/components.json app/web/src/components/ui app/web/package.json pnpm-lock.yaml
git commit -m "feat(web): Button primitive built on owned shadcn source"
```

---

## Task 9: Layout shell and the ten route skeletons

**Files:**

- Create: `app/web/src/components/layout/{Container,Section,SkipLink,BookingCta,Header,Footer}.tsx`
- Create: `app/web/src/components/sections/PageHeader.tsx`
- Create: `app/web/src/app/layout.tsx`, `app/web/src/app/page.tsx`
- Create: `app/web/src/app/{services,work,about,process,contact,careers,privacy,terms}/page.tsx`
- Create: `app/web/src/app/not-found.tsx`
- Create: `app/web/src/components/layout/layout.test.tsx`

**Interfaces:**

- Consumes: Tasks 7 and 8.
- Produces: `<Container>`, `<Section>`, `<PageHeader title description>`, `<Header>`, `<Footer>`, `<BookingCta>`; ten exported routes.

- [ ] **Step 1: Write the failing layout test**

Create `app/web/src/components/layout/layout.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Footer } from './Footer'
import { Header } from './Header'
import { SkipLink } from './SkipLink'
import { footerNav, nav } from '@/content/nav'
import { site } from '@/content/site'
import { ui } from '@/content/ui'
import { env } from '@/lib/env'

describe('Header', () => {
  it('renders every primary nav destination', () => {
    render(<Header />)
    for (const item of nav) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute(
        'href',
        item.href,
      )
    }
  })

  it('offers a working call to action whether or not booking is configured', () => {
    render(<Header />)
    if (env.bookingUrl === null) {
      const cta = screen.getByRole('link', { name: ui.contactFallback })
      expect(cta).toHaveAttribute('href', `mailto:${site.contactEmail}`)
    } else {
      const cta = screen.getByRole('link', { name: ui.bookCall })
      expect(cta).toHaveAttribute('href', env.bookingUrl)
      expect(cta).toHaveAttribute('rel', expect.stringContaining('noopener'))
    }
  })
})

describe('Footer', () => {
  it('renders every footer destination including legal routes', () => {
    render(<Footer />)
    for (const item of footerNav) {
      expect(screen.getAllByRole('link', { name: item.label }).length).toBeGreaterThan(0)
    }
  })
})

describe('SkipLink', () => {
  it('targets the main landmark', () => {
    render(<SkipLink />)
    expect(screen.getByRole('link', { name: ui.skipToContent })).toHaveAttribute(
      'href',
      '#main',
    )
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm -F web exec vitest run src/components/layout`
Expected: FAIL — cannot resolve `./Footer`.

- [ ] **Step 3: Create the primitives**

Create `app/web/src/components/layout/Container.tsx`:

```tsx
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export function Container({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', className)} {...props} />
  )
}
```

Create `app/web/src/components/layout/Section.tsx`:

```tsx
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export function Section({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn('py-16 sm:py-24', className)} {...props} />
}
```

Create `app/web/src/components/layout/SkipLink.tsx`:

```tsx
import { ui } from '@/content/ui'

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-full bg-accent px-4 py-2 text-base focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50"
    >
      {ui.skipToContent}
    </a>
  )
}
```

Create `app/web/src/components/layout/BookingCta.tsx`:

```tsx
import { Button } from '@/components/ui/button'
import { site } from '@/content/site'
import { ui } from '@/content/ui'
import { env } from '@/lib/env'

type BookingCtaProps = {
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Primary call to action. With no booking URL configured it degrades to an
 * email link rather than rendering a dead button — the same pattern the
 * contact form uses when its endpoint is unset.
 */
export function BookingCta({ size = 'md' }: BookingCtaProps) {
  if (env.bookingUrl === null) {
    return (
      <Button asChild size={size}>
        <a href={`mailto:${site.contactEmail}`}>{ui.contactFallback}</a>
      </Button>
    )
  }

  return (
    <Button asChild size={size}>
      <a href={env.bookingUrl} target="_blank" rel="noopener noreferrer">
        {ui.bookCall}
      </a>
    </Button>
  )
}
```

- [ ] **Step 4: Create the Header and Footer**

Create `app/web/src/components/layout/Header.tsx`:

```tsx
import Link from 'next/link'

import { BookingCta } from './BookingCta'
import { Container } from './Container'
import { nav } from '@/content/nav'
import { site } from '@/content/site'

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-base/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="font-semibold tracking-tight text-text">
          {site.name}
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted transition-colors hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block">
          <BookingCta size="sm" />
        </div>
      </Container>
    </header>
  )
}
```

A mobile menu is deliberately deferred to phase 2, where the nav gets its
designed treatment; the links remain reachable in the footer meanwhile.

Create `app/web/src/components/layout/Footer.tsx`:

```tsx
import Link from 'next/link'

import { Container } from './Container'
import { footerNav } from '@/content/nav'
import { site } from '@/content/site'
import { ui } from '@/content/ui'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border">
      <Container className="flex flex-col gap-8 py-12 sm:flex-row sm:justify-between">
        <div>
          <p className="font-semibold text-text">{site.name}</p>
          <p className="mt-2 max-w-sm text-sm text-muted">{site.tagline}</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2">
          {footerNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted transition-colors hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </Container>
      <Container className="border-t border-border py-6">
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} {site.name}. {ui.footerRights}
        </p>
      </Container>
    </footer>
  )
}
```

- [ ] **Step 5: Run the layout test to verify it passes**

Run: `pnpm -F web exec vitest run src/components/layout`
Expected: PASS.

- [ ] **Step 6: Create the shared page header**

Create `app/web/src/components/sections/PageHeader.tsx`:

```tsx
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'

type PageHeaderProps = {
  title: string
  description: string
}

/** Every route renders exactly one of these, which is what guarantees one h1
 *  per page. Phase 2 replaces the visual treatment, not the structure. */
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <Section>
      <Container>
        <h1 className="text-4xl font-semibold tracking-tight text-text sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">{description}</p>
      </Container>
    </Section>
  )
}
```

- [ ] **Step 7: Create the root layout**

Create `app/web/src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { SkipLink } from '@/components/layout/SkipLink'
import { site } from '@/content/site'
import { env } from '@/lib/env'
import '@/styles/globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.tagline,
  openGraph: { siteName: site.name, type: 'website', locale: 'en' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  // data-theme is reserved for a future light mode; it is unused today and
  // keeps that retrofit to one token block rather than a rewrite.
  return (
    <html lang="en" data-theme="dark">
      <body className="flex min-h-dvh flex-col">
        <SkipLink />
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
```

- [ ] **Step 8: Create the home route**

Create `app/web/src/app/page.tsx`:

```tsx
import { BookingCta } from '@/components/layout/BookingCta'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { site } from '@/content/site'

export default function HomePage() {
  return (
    <>
      <Section>
        <Container>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-text sm:text-6xl">
            {site.tagline}
          </h1>
          {/* Phase 3 replaces this section's background with the signature
              WebGL moment. The composition stays; the effect sits behind it. */}
          <div className="mt-10">
            <BookingCta size="lg" />
          </div>
        </Container>
      </Section>
    </>
  )
}
```

- [ ] **Step 9: Create the eight inner routes**

Each is a `PageHeader` with route metadata. Create each file with this shape, substituting the values from the table below.

`app/web/src/app/services/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'

export const metadata: Metadata = {
  title: 'Services',
  description: 'What we build, and how we price it.',
}

export default function ServicesPage() {
  return <PageHeader title="Services" description="What we build, and how we price it." />
}
```

Repeat for the remaining seven, changing the directory, component name, title and description:

| Directory | Component     | Title            | Description                                                   |
| --------- | ------------- | ---------------- | ------------------------------------------------------------- |
| `work`    | `WorkPage`    | `Work`           | `Case studies are in production. Talk to us in the meantime.` |
| `about`   | `AboutPage`   | `About`          | `A small senior team, and how we work together.`              |
| `process` | `ProcessPage` | `Process`        | `How an engagement runs, from first call to launch.`          |
| `contact` | `ContactPage` | `Contact`        | `Tell us about the project, or book a call directly.`         |
| `careers` | `CareersPage` | `Careers`        | `How we hire, and what we look for.`                          |
| `privacy` | `PrivacyPage` | `Privacy Policy` | `How we handle information you send us.`                      |
| `terms`   | `TermsPage`   | `Terms`          | `The terms that apply to this site.`                          |

- [ ] **Step 10: Create the 404 route**

Create `app/web/src/app/not-found.tsx`:

```tsx
import Link from 'next/link'

import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <Section>
      <Container>
        <h1 className="text-4xl font-semibold tracking-tight text-text sm:text-5xl">
          That page does not exist
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          The link may be out of date. Everything else is still where you left it.
        </p>
        <div className="mt-10">
          <Button asChild>
            <Link href="/">Back to the home page</Link>
          </Button>
        </div>
      </Container>
    </Section>
  )
}
```

- [ ] **Step 11: Build and verify the exported file shape**

This pins Review Focus item 3 — the single thing a broken static export would hide.

```bash
pnpm -F web build
for p in index services/index work/index about/index process/index \
         contact/index careers/index privacy/index terms/index 404; do
  test -f "app/web/out/$p.html" && echo "ok   $p.html" || echo "MISSING $p.html"
done
```

Expected: ten `ok` lines, no `MISSING`. A missing `404.html` means `not-found.tsx` did not export; a missing `services/index.html` means `trailingSlash` is not set.

- [ ] **Step 12: Verify each route contains its own content, not the home page's**

```bash
grep -q 'What we build' app/web/out/services/index.html && echo "ok services distinct"
grep -q 'in production' app/web/out/work/index.html && echo "ok work distinct"
grep -q 'does not exist' app/web/out/404.html && echo "ok 404 distinct"
```

Expected: three `ok` lines.

- [ ] **Step 13: Commit**

```bash
git add app/web/src/components app/web/src/app
git commit -m "feat(web): layout shell and ten route skeletons"
```

---

## Task 10: sitemap and robots

**Files:**

- Create: `app/web/src/app/sitemap.ts`, `app/web/src/app/robots.ts`, `app/web/src/app/seo.test.ts`

**Interfaces:**

- Consumes: Tasks 7 and 9.
- Produces: `out/sitemap.xml` and `out/robots.txt` driven by `env.siteUrl`.

- [ ] **Step 1: Write the failing SEO test**

Create `app/web/src/app/seo.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import robots from './robots'
import sitemap from './sitemap'
import { footerNav } from '@/content/nav'

describe('sitemap', () => {
  it('lists the home route and every footer destination', () => {
    const entries = sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://mccorlabs.com/')
    for (const item of footerNav) {
      expect(urls).toContain(`https://mccorlabs.com${item.href}`)
    }
  })

  it('never emits a duplicate url', () => {
    const urls = sitemap().map((e) => e.url)
    expect(new Set(urls).size).toBe(urls.length)
  })
})

describe('robots', () => {
  it('allows crawling and points at the sitemap', () => {
    const result = robots()
    expect(result.sitemap).toBe('https://mccorlabs.com/sitemap.xml')
    expect(result.rules).toMatchObject({ userAgent: '*', allow: '/' })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm -F web exec vitest run src/app/seo.test.ts`
Expected: FAIL — cannot resolve `./robots`.

- [ ] **Step 3: Create the sitemap**

Create `app/web/src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next'

import { footerNav } from '@/content/nav'
import { env } from '@/lib/env'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const paths = ['/', ...footerNav.map((item) => item.href)]
  const unique = [...new Set(paths)]

  return unique.map((path) => ({
    url: `${env.siteUrl}${path}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }))
}
```

- [ ] **Step 4: Create robots**

Create `app/web/src/app/robots.ts`:

```ts
import type { MetadataRoute } from 'next'

import { env } from '@/lib/env'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${env.siteUrl}/sitemap.xml`,
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm -F web exec vitest run src/app/seo.test.ts`
Expected: PASS.

- [ ] **Step 6: Verify both files land in the export**

```bash
pnpm -F web build
test -f app/web/out/sitemap.xml && echo "ok sitemap"
test -f app/web/out/robots.txt && echo "ok robots"
grep -c '<url>' app/web/out/sitemap.xml
```

Expected: both `ok` lines, and a count of 9 (home plus eight footer destinations, deduplicated).

- [ ] **Step 7: Commit**

```bash
git add app/web/src/app/sitemap.ts app/web/src/app/robots.ts app/web/src/app/seo.test.ts
git commit -m "feat(web): static sitemap and robots driven by env"
```

---

## Task 11: Contact form client with a graceful missing-endpoint path

**Files:**

- Create: `app/web/src/lib/contact.ts`, `app/web/src/lib/contact.test.ts`
- Create: `app/web/src/components/contact/ContactForm.tsx`, `ContactForm.test.tsx`
- Modify: `app/web/src/app/contact/page.tsx`

**Interfaces:**

- Consumes: Tasks 7 and 8.
- Produces: `ContactRequest`, `ContactResponse`, `validateContact()`, `submitContact()`, `<ContactForm>`.

- [ ] **Step 1: Write the failing contact client test**

Create `app/web/src/lib/contact.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { submitContact, validateContact, type ContactRequest } from './contact'

const valid: ContactRequest = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'We need a marketing site and a client portal.',
  honeypot: '',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('validateContact', () => {
  it('accepts a well-formed submission', () => {
    expect(validateContact(valid)).toEqual({})
  })

  it('requires a name', () => {
    expect(validateContact({ ...valid, name: '' }).name).toBeTruthy()
  })

  it('rejects a malformed email', () => {
    expect(validateContact({ ...valid, email: 'nope' }).email).toBeTruthy()
  })

  it('requires a message of at least ten characters', () => {
    expect(validateContact({ ...valid, message: 'too short' }).message).toBeTruthy()
  })

  it('rejects an over-long message rather than sending it', () => {
    expect(validateContact({ ...valid, message: 'x'.repeat(5001) }).message).toBeTruthy()
  })
})

describe('submitContact', () => {
  it('returns a server error without fetching when no endpoint is configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await submitContact(valid, null)
    expect(result).toEqual({ ok: false, error: 'server' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('refuses to send a payload it knows is invalid', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await submitContact(
      { ...valid, email: 'nope' },
      'https://api.test/contact',
    )
    expect(result).toEqual({ ok: false, error: 'validation' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('reports success on a 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    expect(await submitContact(valid, 'https://api.test/contact')).toEqual({ ok: true })
  })

  it('maps a 429 to rate_limit', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 429 }))
    expect(await submitContact(valid, 'https://api.test/contact')).toEqual({
      ok: false,
      error: 'rate_limit',
    })
  })

  it('maps a 400 to validation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 400 }))
    expect(await submitContact(valid, 'https://api.test/contact')).toEqual({
      ok: false,
      error: 'validation',
    })
  })

  it('maps a network failure to server rather than throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    expect(await submitContact(valid, 'https://api.test/contact')).toEqual({
      ok: false,
      error: 'server',
    })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm -F web exec vitest run src/lib/contact.test.ts`
Expected: FAIL — cannot resolve `./contact`.

- [ ] **Step 3: Create the contact client**

Create `app/web/src/lib/contact.ts`:

```ts
export type ContactRequest = {
  name: string
  email: string
  company?: string
  message: string
  budget?: string
  /** Must stay empty. A bot filling it means the submission is discarded. */
  honeypot: string
}

export type ContactResponse =
  | { ok: true }
  | { ok: false; error: 'validation' | 'rate_limit' | 'server'; detail?: string }

export type ContactErrors = Partial<
  Record<'name' | 'email' | 'company' | 'message', string>
>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateContact(request: ContactRequest): ContactErrors {
  const errors: ContactErrors = {}
  const name = request.name.trim()
  const email = request.email.trim()
  const message = request.message.trim()

  if (name.length < 1) errors.name = 'Please tell us your name.'
  else if (name.length > 100) errors.name = 'That name is too long.'

  if (!EMAIL.test(email)) errors.email = 'Please enter a valid email address.'

  if ((request.company ?? '').length > 100)
    errors.company = 'That company name is too long.'

  if (message.length < 10) errors.message = 'Please add a little more detail.'
  else if (message.length > 5000)
    errors.message = 'Please shorten this to under 5000 characters.'

  return errors
}

/**
 * Posts the submission. Validates locally first and never sends a payload it
 * knows to be invalid, so a `validation` response from the server indicates a
 * bug or an attack rather than ordinary user error.
 */
export async function submitContact(
  request: ContactRequest,
  endpoint: string | null,
): Promise<ContactResponse> {
  if (endpoint === null) return { ok: false, error: 'server' }
  if (Object.keys(validateContact(request)).length > 0) {
    return { ok: false, error: 'validation' }
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    })

    if (response.ok) return { ok: true }
    if (response.status === 429) return { ok: false, error: 'rate_limit' }
    if (response.status === 400) return { ok: false, error: 'validation' }
    return { ok: false, error: 'server' }
  } catch {
    return { ok: false, error: 'server' }
  }
}
```

- [ ] **Step 4: Run the client test to verify it passes**

Run: `pnpm -F web exec vitest run src/lib/contact.test.ts`
Expected: PASS — all twelve cases.

- [ ] **Step 5: Write the failing form test**

This pins Review Focus item 4. Create `app/web/src/components/contact/ContactForm.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactForm } from './ContactForm'
import { site } from '@/content/site'
import { ui } from '@/content/ui'

describe('ContactForm with no endpoint configured', () => {
  it('shows a real way to make contact instead of a dead button', () => {
    render(<ContactForm endpoint={null} />)
    expect(screen.queryByRole('button', { name: ui.formSubmit })).not.toBeInTheDocument()
    // The mailto is always present; the booking link only when configured.
    expect(screen.getByRole('link', { name: /mccorlabs\.com/i })).toHaveAttribute(
      'href',
      `mailto:${site.contactEmail}`,
    )
  })
})

describe('ContactForm with an endpoint', () => {
  it('labels every field', () => {
    render(<ContactForm endpoint="https://api.test/contact" />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
  })

  it('shows inline errors and does not fetch when the form is invalid', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<ContactForm endpoint="https://api.test/contact" />)
    await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
    expect(await screen.findByText('Please tell us your name.')).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('announces success in a live region', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    render(<ContactForm endpoint="https://api.test/contact" />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Ada Lovelace')
    await userEvent.type(screen.getByLabelText(/email/i), 'ada@example.com')
    await userEvent.type(
      screen.getByLabelText(/message/i),
      'We need a marketing site and a portal.',
    )
    await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
    expect(await screen.findByRole('status')).toHaveTextContent(ui.formSuccess)
  })

  it('keeps the honeypot out of the tab order', () => {
    render(<ContactForm endpoint="https://api.test/contact" />)
    const honeypot = document.querySelector('input[name="honeypot"]')
    expect(honeypot).toHaveAttribute('tabindex', '-1')
    expect(honeypot).toHaveAttribute('aria-hidden', 'true')
  })
})
```

- [ ] **Step 6: Install the interaction testing library**

Run: `pnpm -F web add -D @testing-library/user-event@^15`

- [ ] **Step 7: Run it to verify it fails**

Run: `pnpm -F web exec vitest run src/components/contact`
Expected: FAIL — cannot resolve `./ContactForm`.

- [ ] **Step 8: Create the form**

Create `app/web/src/components/contact/ContactForm.tsx`:

```tsx
'use client'

import { useState, type FormEvent } from 'react'

import { BookingCta } from '@/components/layout/BookingCta'
import { Button } from '@/components/ui/button'
import { site } from '@/content/site'
import { ui } from '@/content/ui'
import { submitContact, validateContact, type ContactErrors } from '@/lib/contact'

type Status = 'idle' | 'sending' | 'sent' | 'error'

const FIELD =
  'border-border-strong bg-surface text-text placeholder:text-muted w-full rounded-lg border px-3 py-2'

export function ContactForm({ endpoint }: { endpoint: string | null }) {
  const [errors, setErrors] = useState<ContactErrors>({})
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  // No endpoint provisioned yet: offer routes that actually work rather than
  // a button that silently fails.
  if (endpoint === null) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="text-text">
          Our contact form is not live yet — book a call or email us directly.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <BookingCta />
          <Button asChild variant="link">
            <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
          </Button>
        </div>
      </div>
    )
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const request = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      company: String(data.get('company') ?? ''),
      message: String(data.get('message') ?? ''),
      budget: String(data.get('budget') ?? ''),
      honeypot: String(data.get('honeypot') ?? ''),
    }

    const found = validateContact(request)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setStatus('idle')
      setMessage('')
      return
    }

    setStatus('sending')
    const result = await submitContact(request, endpoint)

    if (result.ok) {
      setStatus('sent')
      setMessage(ui.formSuccess)
      return
    }

    setStatus('error')
    setMessage(
      result.error === 'rate_limit'
        ? ui.formErrorRateLimit
        : result.error === 'validation'
          ? ui.formErrorValidation
          : ui.formErrorServer,
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-5">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm text-text">
          Name
        </label>
        <input
          id="name"
          name="name"
          className={FIELD}
          aria-invalid={errors.name !== undefined}
          aria-describedby={errors.name === undefined ? undefined : 'name-error'}
        />
        {errors.name !== undefined && (
          <p id="name-error" className="mt-1 text-sm text-accent">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm text-text">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className={FIELD}
          aria-invalid={errors.email !== undefined}
          aria-describedby={errors.email === undefined ? undefined : 'email-error'}
        />
        {errors.email !== undefined && (
          <p id="email-error" className="mt-1 text-sm text-accent">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="company" className="mb-1 block text-sm text-text">
          Company <span className="text-muted">(optional)</span>
        </label>
        <input id="company" name="company" className={FIELD} />
      </div>

      <div>
        <label htmlFor="budget" className="mb-1 block text-sm text-text">
          Budget <span className="text-muted">(optional)</span>
        </label>
        <select id="budget" name="budget" className={FIELD} defaultValue="">
          <option value="">Prefer not to say</option>
          {site.budgetOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className="mb-1 block text-sm text-text">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          className={FIELD}
          aria-invalid={errors.message !== undefined}
          aria-describedby={errors.message === undefined ? undefined : 'message-error'}
        />
        {errors.message !== undefined && (
          <p id="message-error" className="mt-1 text-sm text-accent">
            {errors.message}
          </p>
        )}
      </div>

      {/* Honeypot: hidden from sight and from the keyboard, but present in the
          DOM so naive bots fill it. Not display:none, which some bots detect. */}
      <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="honeypot">Leave this empty</label>
        <input id="honeypot" name="honeypot" tabIndex={-1} aria-hidden="true" />
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? ui.formSending : ui.formSubmit}
        </Button>
      </div>

      <p role="status" aria-live="polite" className="text-sm text-muted">
        {message}
      </p>
    </form>
  )
}
```

- [ ] **Step 9: Run the form test to verify it passes**

Run: `pnpm -F web exec vitest run src/components/contact`
Expected: PASS — all five cases.

- [ ] **Step 10: Wire the form into the contact route**

Replace `app/web/src/app/contact/page.tsx`:

```tsx
import type { Metadata } from 'next'

import { ContactForm } from '@/components/contact/ContactForm'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { PageHeader } from '@/components/sections/PageHeader'
import { env } from '@/lib/env'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Tell us about the project, or book a call directly.',
}

export default function ContactPage() {
  return (
    <>
      <PageHeader
        title="Contact"
        description="Tell us about the project, or book a call directly."
      />
      <Section className="pt-0">
        <Container>
          <ContactForm endpoint={env.contactEndpoint} />
        </Container>
      </Section>
    </>
  )
}
```

- [ ] **Step 11: Verify the build still exports**

Run: `pnpm -F web build && test -f app/web/out/contact/index.html && echo "ok contact"`
Expected: `ok contact`.

- [ ] **Step 12: Commit**

```bash
git add app/web/src/lib/contact.ts app/web/src/lib/contact.test.ts app/web/src/components/contact app/web/src/app/contact app/web/package.json pnpm-lock.yaml
git commit -m "feat(web): contact form client that degrades without an endpoint"
```

---

## Task 12: Playwright against the exported build

**Files:**

- Create: `app/web/playwright.config.ts`
- Create: `app/web/tests/e2e/{routes,a11y,contact,motion}.spec.ts`
- Modify: `app/web/package.json`

**Interfaces:**

- Consumes: Tasks 9-11.
- Produces: `pnpm -F web test:e2e` and `test:e2e:smoke`.

- [ ] **Step 1: Install Playwright, axe and a static server**

Playwright stays at the repository ROOT, where it is already installed and exactly pinned. Do not add it to `app/web`: two Playwright versions in one repo is precisely the hazard the root `package.json`'s `"//"` comment guards against, because each version wants a specific browser revision.

Run:

```bash
pnpm add -D -w @axe-core/playwright@^4 serve@^14
```

Then confirm the already-installed Playwright and its cached browser, rather than downloading anything:

Run: `pnpm exec playwright --version && ls -d ~/Library/Caches/ms-playwright/chromium-* 2>/dev/null`
Expected: version `1.61.0`, and at least one `chromium-*` directory listed.

**Do not run `playwright install`.** Version 1.61.0's bundled browser revision already matches the cached `chromium-1228`. Running the installer risks pulling a ~500MB browser onto a volume at 89% capacity for no benefit. If the version check above prints something other than 1.61.0, stop and report rather than installing.

- [ ] **Step 2: Create the Playwright config**

Create `app/web/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

const PORT = 4321

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Serves the real exported build, not the dev server.
    //
    // CAVEAT: `serve` resolves directory indexes and clean URLs, which
    // CloudFront with a plain S3 origin does NOT do until the rewrite
    // function lands (spec: CloudFront handoff). These tests therefore prove
    // the export is correct; they cannot prove production routing works.
    command: 'pnpm exec serve out --listen ' + String(PORT) + ' --single=false',
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
})
```

- [ ] **Step 3: Write the route tests**

Create `app/web/tests/e2e/routes.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

const ROUTES = [
  { path: '/', heading: /design and build/i },
  { path: '/services/', heading: 'Services' },
  { path: '/work/', heading: 'Work' },
  { path: '/about/', heading: 'About' },
  { path: '/process/', heading: 'Process' },
  { path: '/contact/', heading: 'Contact' },
  { path: '/careers/', heading: 'Careers' },
  { path: '/privacy/', heading: 'Privacy Policy' },
  { path: '/terms/', heading: 'Terms' },
] as const

test.describe('routes', () => {
  for (const route of ROUTES) {
    test(`${route.path} renders its own h1 @smoke`, async ({ page }) => {
      await page.goto(route.path)
      const headings = page.locator('h1')
      await expect(headings).toHaveCount(1)
      await expect(headings.first()).toContainText(route.heading)
    })
  }

  test('a working primary cta is reachable from every route @smoke', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route.path)
      // Either a real booking link or the email fallback — never neither, and
      // never a relative or empty href.
      const cta = page
        .locator('header a[href^="https://"], header a[href^="mailto:"]')
        .first()
      await expect(cta).toBeVisible()
    }
  })

  test('no internal link is broken @smoke', async ({ page, request }) => {
    await page.goto('/')
    const hrefs = await page
      .locator('a[href^="/"]')
      .evaluateAll((links) => links.map((l) => l.getAttribute('href') ?? ''))
    for (const href of new Set(hrefs)) {
      const response = await request.get(href)
      expect(response.status(), `${href} should resolve`).toBeLessThan(400)
    }
  })

  test('the 404 page is exported and distinct', async ({ page }) => {
    await page.goto('/404.html')
    await expect(page.locator('h1')).toContainText(/does not exist/i)
  })
})
```

- [ ] **Step 4: Write the accessibility test**

Create `app/web/tests/e2e/a11y.spec.ts`:

```ts
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const PATHS = [
  '/',
  '/services/',
  '/work/',
  '/about/',
  '/process/',
  '/contact/',
  '/careers/',
  '/privacy/',
  '/terms/',
  '/404.html',
] as const

for (const path of PATHS) {
  test(`${path} has no axe violations`, async ({ page }) => {
    await page.goto(path)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
}

test('the skip link is the first focusable element @smoke', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toHaveText(/skip to content/i)
})

test('every interactive element shows a visible focus indicator', async ({ page }) => {
  await page.goto('/contact/')
  const outline = await page.getByLabel('Name').evaluate((element) => {
    element.focus()
    return getComputedStyle(element).outlineStyle
  })
  expect(outline).not.toBe('none')
})
```

- [ ] **Step 5: Write the contact form e2e test**

Create `app/web/tests/e2e/contact.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test.describe('contact route', () => {
  test('offers a way to reach the firm @smoke', async ({ page }) => {
    await page.goto('/contact/')
    // With no endpoint configured at build time the form degrades to the
    // booking link plus a mailto. Either shape must give the visitor a route.
    const hasForm = await page.getByRole('button', { name: /send message/i }).count()
    const hasMailto = await page.locator('a[href^="mailto:"]').count()
    expect(hasForm + hasMailto).toBeGreaterThan(0)
  })

  test('never renders a submit button without an endpoint', async ({ page }) => {
    await page.goto('/contact/')
    const submit = page.getByRole('button', { name: /send message/i })
    const mailto = page.locator('a[href^="mailto:"]')
    if ((await submit.count()) === 0) {
      await expect(mailto.first()).toBeVisible()
    }
  })
})
```

- [ ] **Step 6: Write the reduced-motion test**

Create `app/web/tests/e2e/motion.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce' })

test('all content renders and nothing animates under reduced motion @smoke', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible()
  await page.waitForTimeout(600)
  const running = await page.evaluate(() => document.getAnimations().length)
  expect(running).toBe(0)
})

test('no video autoplays under reduced motion', async ({ page }) => {
  await page.goto('/')
  const autoplaying = await page.evaluate(
    () => [...document.querySelectorAll('video')].filter((v) => v.autoplay).length,
  )
  expect(autoplaying).toBe(0)
})
```

- [ ] **Step 7: Run the full e2e suite**

Run: `pnpm -F web build && pnpm -F web test:e2e`
Expected: all specs pass. Playwright builds nothing itself — it serves `out/`, so the build must run first.

- [ ] **Step 8: Run the smoke subset the hook uses**

Run: `pnpm -F web test:e2e:smoke`
Expected: passes, and noticeably faster than the full suite.

- [ ] **Step 9: Commit**

```bash
git add app/web/playwright.config.ts app/web/tests app/web/package.json pnpm-lock.yaml
git commit -m "test(web): Playwright route, accessibility, contact and motion suites"
```

---

## Task 13: README, and full phase verification

**Files:**

- Modify: `README.md`

**Interfaces:**

- Consumes: every prior task.
- Produces: the documentation success criterion 6 requires, and a verified phase-1 exit.

- [ ] **Step 1: Add the website sections to the README**

Append to `README.md`, after the _Your real frontend_ section, matching the file's existing voice (fenced bash blocks, prose before or after each):

````markdown
## The website

The marketing site lives in `app/web`. It is a Next.js app that builds to plain
static files, deployed to the same S3 bucket and CloudFront distribution as
everything else here.

Requirements: Node 24 (see `.node-version`), pnpm 12, and the 1Password CLI (`op`), signed in.

### Running it locally

```bash
pnpm install
pnpm approve-builds lefthook
pnpm dev                      # via `op run`; needs the 1Password CLI, signed in
```
````

`pnpm install` also installs the git hooks. pnpm blocks dependency build scripts
by default, so `pnpm approve-builds lefthook` is required — without it the hooks
never install and every check silently passes. Confirm with:

```bash
test -f .git/hooks/pre-commit && echo "hooks installed"
```

- The 1Password CLI must be installed and signed in for `pnpm dev` and `pnpm build` — both go through `op run`.
- Values live in 1Password, in the `Development` vault under the `mccor-labs` item.
- A locked 1Password means the pre-push hook's `build` step fails with an `op` error, not a code error — check that first before debugging the build.

The site runs at http://localhost:3000.

### Editing content

All copy lives in `app/web/src/content/`. Services, team members, process stages
and navigation are typed, so a missing field is a build error rather than a blank
space on the page. No copy lives in components.

### Checks

`git commit` formats and lints the files in that commit, taking a couple of
seconds. `git push` runs the full gate: type-check, lint, format check, unit
tests, a production build and smoke tests. To run it by hand:

```bash
pnpm verify
```

To bypass the hooks — for a work-in-progress commit on a branch, never on main:

```bash
LEFTHOOK=0 git commit -m "wip"
```

### Building and deploying

```bash
pnpm build
```

That writes `app/web/out/`. To deploy it:

```bash
aws s3 sync app/web/out/ "s3://$(cd infra && terraform output -raw site_bucket)/" --delete
aws cloudfront create-invalidation \
  --distribution-id "$(cd infra && terraform output -raw cloudfront_distribution_id)" \
  --paths '/*'
```

CloudFront invalidation is not instant; allow a few minutes.

**Routes other than `/` do not work in production yet.** The CloudFront
distribution needs a URI-rewrite function and real 404 error responses before
`/services/` resolves to anything other than the home page. See the _CloudFront
handoff_ section of
`docs/superpowers/specs/2026-09-27-mccorlabs-website-design.md`. Everything
builds and passes locally regardless, because a local static server resolves
directory indexes and CloudFront does not.

````

- [ ] **Step 2: Run the whole verification gate**

Run: `pnpm verify`
Expected: type-check, lint, format check, unit tests and build all pass in sequence.

- [ ] **Step 3: Confirm the export shape one final time**

```bash
for p in index services/index work/index about/index process/index \
         contact/index careers/index privacy/index terms/index 404; do
  test -f "app/web/out/$p.html" || echo "MISSING $p.html"
done
test -f app/web/out/sitemap.xml || echo "MISSING sitemap.xml"
test -f app/web/out/robots.txt || echo "MISSING robots.txt"
echo "export check done"
````

Expected: only `export check done`. Any `MISSING` line fails the phase.

- [ ] **Step 4: Confirm the hooks block a bad push**

```bash
printf 'export const broken: number = "not a number"\n' > app/web/src/__typeprobe.ts
git add app/web/src/__typeprobe.ts
git commit -m "test: type probe" --no-verify
git push --dry-run 2>&1 | tail -20
```

Expected: the push is refused, with `fail_text` reading "Type errors. Fix before pushing."

- [ ] **Step 5: Remove the probe**

```bash
git reset --hard HEAD~1
test -f app/web/src/__typeprobe.ts && echo "PROBE STILL PRESENT" || echo "clean"
```

Expected: `clean`.

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs(web): local development and deployment"
```

- [ ] **Step 7: Report phase 1 status**

Report to the owner, using exactly this framing — the qualification matters, because route resolution and 404 status genuinely cannot be proven locally:

> Phase 1 complete. The site builds and all checks pass locally: `pnpm verify`
> green, ten routes plus `404.html` exported with distinct content, accessibility
> suite clean, hooks verified to block a bad push. Nothing is deployed. Route
> resolution and 404 status in production remain unverified and depend on the
> CloudFront handoff in phase 4.

Then list for the owner: the `TODO(owner)` markers in `src/content/site.ts`
(none remaining in site.ts), and that phase 2 is
blocked until the reference corpus at `docs/ui-references/` has tier-1
captures.

---

## Notes for phases 2 and 3

**Scope is fixed.** The spec's revision gate permits changing provisional visual
values — type scale, spacing, durations, easings, and which signature effect
lands on which page — from measured corpus data. It is not licence to drop a
feature. All four effect techniques, the intro overlay, the audio system, the ten
routes and the media pipeline remain in scope regardless of what the corpus
shows. An agent that cannot deliver one of them reports that, rather than
quietly narrowing the plan.

**What phase 1 deliberately left as a stub**, so phase 2 knows where to build:

| Stub                                                       | Where                              | Phase 2 replaces it with                                                                                    |
| ---------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Home hero is a heading and a CTA                           | `src/app/page.tsx`                 | Full hero composition; phase 3 adds the shader behind it.                                                   |
| Eight routes are a `PageHeader` only                       | `src/app/*/page.tsx`               | Real sections composed from typed content.                                                                  |
| No mobile menu                                             | `src/components/layout/Header.tsx` | Designed nav treatment; links stay in the footer meanwhile.                                                 |
| `services.ts`, `team.ts`, `process.ts` do not exist        | `src/content/`                     | Populated content files; types already defined in `types.ts`.                                               |
| Tagline is final; other copy is not                        | `src/content/site.ts`              | Services, team and process content files, written in phase 2.                                               |
| No media at all                                            | —                                  | `media-planner` then `sourcing-media`, then the sharp pipeline.                                             |
| No motion primitives                                       | `src/components/motion/`           | `Reveal`, `Stagger`, `Parallax`, `Magnetic`.                                                                |
| No performance budget test                                 | `tests/e2e/`                       | `budgets.spec.ts` per the spec's measurement method.                                                        |
| Typography is Tailwind's default scale, not a designed one | `src/app/**`, `src/components/**`  | Measured type scale and self-hosted fonts from the revision gate. Phase 1 sets no font tokens deliberately. |
