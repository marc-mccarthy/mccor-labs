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
