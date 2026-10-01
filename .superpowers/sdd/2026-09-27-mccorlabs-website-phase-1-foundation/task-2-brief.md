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

