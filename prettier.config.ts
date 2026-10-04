import type { Config } from 'prettier'

const config: Config = {
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 90,
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './app/web/src/styles/globals.css',
}

export default config
