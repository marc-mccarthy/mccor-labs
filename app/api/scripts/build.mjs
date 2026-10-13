import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, readdirSync, rmSync, utimesSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = fileURLToPath(new URL('..', import.meta.url))
const handlersDir = join(root, 'src/handlers')
const distDir = join(root, 'dist')
const fixedTime = new Date('2000-01-01T00:00:00Z')

const names = readdirSync(handlersDir)
  .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
  .map((file) => file.slice(0, -3))

if (names.length === 0) {
  throw new Error(`No handlers found in ${handlersDir}`)
}

rmSync(distDir, { recursive: true, force: true })

for (const name of names) {
  const outDir = join(distDir, name)
  const outfile = join(outDir, 'index.mjs')
  mkdirSync(outDir, { recursive: true })
  await build({
    entryPoints: [join(handlersDir, `${name}.ts`)],
    outfile,
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'esm',
    minify: true,
    keepNames: true,
    legalComments: 'none',
    banner: {
      js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    },
    logLevel: 'warning',
  })
  chmodSync(outfile, 0o644)
  utimesSync(outfile, fixedTime, fixedTime)
  execFileSync('zip', ['-X', '-q', '-j', join(distDir, `${name}.zip`), outfile], {
    env: { ...process.env, TZ: 'UTC' },
    stdio: 'inherit',
  })
}
