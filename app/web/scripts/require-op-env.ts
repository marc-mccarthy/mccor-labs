import { fileURLToPath } from 'node:url'

const MARKER = 'DOMAIN_NAME'

export function opEnvError(env: Record<string, string | undefined>): string | null {
  if (MARKER in env) return null
  return [
    'The 1Password settings from app.env are not loaded, so the site would run without',
    'its booking link and other settings. Start the dev server from the repo root:',
    '',
    '  pnpm dev',
    '',
    'To run without the settings anyway: pnpm -F web exec next dev',
  ].join('\n')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const error = opEnvError(process.env)
  if (error) {
    console.error(error)
    process.exit(1)
  }
}
