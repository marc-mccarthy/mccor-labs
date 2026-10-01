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
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
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
          selector:
            'Literal[value=/#[0-9a-fA-F]{3,8}\\b|rgba?\\(|hsla?\\(|oklch\\(/]',
          message:
            'No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css.',
        },
      ],
    },
  },

  {
    files: ['app/web/src/**/*.{ts,tsx}'],
    ignores: [
      'app/web/src/components/motion/**',
      'app/web/src/components/effects/**',
    ],
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

