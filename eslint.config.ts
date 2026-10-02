import { join } from 'node:path'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import prettierConfig from 'eslint-config-prettier/flat'
// eslint-config-next@16.3.6 ships a native flat config array under this subpath, so it is
// imported directly rather than bridged through @eslint/eslintrc's FlatCompat. FlatCompat.extends
// expects a legacy eslintrc-style shareable config and crashes (circular JSON while formatting a
// validation error) when handed this package's already-flat Linter.Config[] export.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

// no-restricted-syntax does not merge across flat-config blocks: the last block that
// matches a file replaces the whole option array. The colour selectors therefore have to be
// repeated in the .tsx block that also carries the text-base selector, so they are declared
// once here.
const rawColourSelectors = [
  {
    // A plain string literal: style={{ color: '#ff0000' }} or className="bg-[#ff0000]".
    selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b|rgba?\\(|hsla?\\(|oklch\\(/]',
    message:
      'No raw colour values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css.',
  },
  {
    // A template literal's own text. Its parts are TemplateElement nodes whose `value` is an
    // object, not a string, so the Literal selector above cannot see them.
    selector:
      'TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b|rgba?\\(|hsla?\\(|oklch\\(/]',
    message:
      'No raw colour values in components, including inside a template literal. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css.',
  },
]

const textBaseMessage =
  'Do not use text-base. The --color-base token makes Tailwind emit text-base as a colour utility, not a font size, and tailwind-merge groups it with the font sizes so one of the two is dropped. Use text-on-accent for a dark label on an accent fill, or text-[1rem] for a 1rem font size.'

const textBaseSelectors = [
  {
    selector: 'Literal[value=/\\btext-base\\b/]',
    message: textBaseMessage,
  },
  {
    selector: 'TemplateElement[value.raw=/\\btext-base\\b/]',
    message: textBaseMessage,
  },
]

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
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
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

  {
    files: ['app/web/src/components/motion/**/*.tsx'],
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },

  // Project rules that enforce the spec's architecture.
  {
    // .ts as well as .tsx: src/content/ and src/lib/ are .ts, and src/content/ is where the
    // typed data — gradient stops, chart colours, media slots — will carry colour values.
    files: ['app/web/src/**/*.{ts,tsx}'],
    ignores: ['app/web/src/styles/**'],
    rules: {
      'no-restricted-syntax': ['error', ...rawColourSelectors],
    },
  },

  {
    // The text-base trap is a className concern, so it is scoped to components, and the
    // colour selectors are restated because this block replaces the option array above.
    files: ['app/web/src/**/*.tsx'],
    ignores: ['app/web/src/styles/**'],
    rules: {
      'no-restricted-syntax': ['error', ...rawColourSelectors, ...textBaseSelectors],
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
            {
              name: 'motion/mini',
              message:
                'Import Motion only inside components/motion or components/effects. Elsewhere, use the motion primitives.',
            },
            {
              name: 'motion/react-client',
              message:
                'Import Motion only inside components/motion or components/effects. Elsewhere, use the motion primitives.',
            },
            {
              name: 'framer-motion',
              message:
                'Import Motion only inside components/motion or components/effects. Elsewhere, use the motion primitives.',
            },
          ],
          patterns: [
            {
              // Both the alias form and the relative sibling form, which is already a house
              // convention (Header.tsx imports ./BookingCta and ./Container that way). The
              // ** variants catch an effect nested a directory deeper.
              group: [
                '**/components/effects/*',
                '**/components/effects/**',
                './effects/*',
                './effects/**',
                '../effects/*',
                '../effects/**',
                '../../effects/*',
                '../../effects/**',
              ],
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
