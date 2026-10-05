import { join } from 'node:path'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import prettierConfig from 'eslint-config-prettier/flat'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

const rawColorSelectors = [
  {
    selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b|rgba?\\(|hsla?\\(|oklch\\(/]',
    message:
      'No raw color values in components. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css.',
  },
  {
    selector:
      'TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b|rgba?\\(|hsla?\\(|oklch\\(/]',
    message:
      'No raw color values in components, including inside a template literal. Use a token: var(--color-*) or its Tailwind utility. Tokens live in src/styles/globals.css.',
  },
]

const textBaseMessage =
  'Do not use text-base. The --color-base token makes Tailwind emit text-base as a color utility, not a font size, and tailwind-merge groups it with the font sizes so one of the two is dropped. Use text-on-accent for a dark label on an accent fill, or text-[1rem] for a 1rem font size.'

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
        tsconfigRootDir: join(import.meta.dirname, 'app/web'),
      },
    },
  },

  {
    files: ['app/web/**/*.tsx'],
    rules: { ...jsxA11y.flatConfigs.recommended.rules },
  },

  {
    files: ['app/web/src/components/motion/**/*.tsx'],
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },

  {
    files: ['app/web/src/**/*.{ts,tsx}'],
    ignores: ['app/web/src/styles/**'],
    rules: {
      'no-restricted-syntax': ['error', ...rawColorSelectors],
    },
  },

  {
    files: ['app/web/src/**/*.tsx'],
    ignores: ['app/web/src/styles/**'],
    rules: {
      'no-restricted-syntax': ['error', ...rawColorSelectors, ...textBaseSelectors],
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
            {
              name: 'three',
              message:
                'Import three only inside components/effects, through SceneRuntime.',
            },
          ],
          patterns: [
            {
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

  {
    files: ['app/web/**/*.{test,spec}.{ts,tsx}', 'app/web/tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      'no-restricted-syntax': 'off',
    },
  },

  prettierConfig,
)
