import { join } from 'node:path'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import prettierConfig from 'eslint-config-prettier/flat'
// eslint-config-next@16.3.6 ships a native flat config array under this subpath, so it is
// imported directly rather than bridged through @eslint/eslintrc's FlatCompat. FlatCompat.extends
// expects a legacy eslintrc-style shareable config and crashes (circular JSON while formatting a
// validation error) when handed this package's already-flat Linter.Config[] export.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      'app/web/.next/**',
      'app/web/out/**',
      // eslint-config-next's own flat config globally ignores this generated file; the
      // /core-web-vitals subpath import used below does not carry that ignore, so it is
      // replicated here.
      'app/web/next-env.d.ts',
      'infra/**',
      'docs/ui-references/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },

  ...nextCoreWebVitals,

  {
    files: ['app/web/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        // A relative tsconfigRootDir does not resolve here; typescript-eslint requires an
        // absolute path, so it is derived from this config file's own directory.
        tsconfigRootDir: join(import.meta.dirname, 'app/web'),
      },
    },
  },

  {
    // next/core-web-vitals already registers the 'jsx-a11y' plugin for all matching files, so
    // this block only adds rules on top of it — redeclaring the plugin here throws
    // "Cannot redefine plugin 'jsx-a11y'" because it would be a different module instance.
    files: ['app/web/**/*.tsx'],
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
