import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(import.meta.dirname, '..', 'out')

const HASHED_DIRS = ['media', 'fonts'] as const
const HASH_LENGTH = 8
const TEXT_EXTENSIONS = new Set([
  '.html',
  '.css',
  '.js',
  '.json',
  '.txt',
  '.xml',
  '.webmanifest',
])

const REVIEW_LIST = 'docs/unused-brand-media.md'
const KEPT_UNREFERENCED: ReadonlySet<string> = new Set([
  '/fonts/OFL.txt',
  '/media/brand/ai-neural-loop.mp4',
  '/media/brand/ai-neural-loop.webm',
  '/media/brand/code-synthesis-loop.mp4',
  '/media/brand/code-synthesis-loop.webm',
  '/media/brand/mccor-ai-neural.jpg',
  '/media/brand/mccor-ai-neural.webp',
  '/media/brand/mccor-code-synthesis.webp',
  '/media/brand/mccor-edge-telemetry.webp',
  '/media/brand/mccor-stag-head.jpg',
  '/media/brand/mccor-stag-head.webp',
  '/media/brand/mccor-stag-hero.jpg',
  '/media/brand/mccor-stag-impact.jpg',
  '/media/brand/mccor-stag-logo-1.webp',
  '/media/brand/mccor-stag-logo.jpg',
  '/media/brand/mccor-stag-logo.svg',
  '/media/brand/mccor-stag-logo.webp',
  '/media/brand/mccor-stag-og.webp',
  '/media/brand/mccor-stag-systems.jpg',
  '/media/brand/mccor-stag-systems.webp',
  '/media/brand/mccor-systems-arch.webp',
  '/media/brand/mccor-vector-space.jpg',
  '/media/brand/mccor-vector-space.webp',
  '/media/brand/stag-logo-run-reassemble.mp4',
  '/media/brand/stag-logo-run-reassemble.webm',
  '/media/brand/stag-turn-run-burst-return.mp4',
  '/media/brand/systems-loop.mp4',
  '/media/brand/systems-loop.webm',
  '/media/brand/systems-pipeline-loop.mp4',
  '/media/brand/systems-pipeline-loop.webm',
  '/media/brand/textures/obsidian-matcap.webp',
  '/media/brand/textures/worley-noise.webp',
])

const HASH_SEGMENT = new RegExp(`\\.([0-9a-f]{${String(HASH_LENGTH)}})\\.[^./]+$`)
const REFERENCE = /(?<![\w.-])\/(?:media|fonts)\/[\w/-]+(?:\.[\w-]+)+/g

function sha256Prefix(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex').slice(0, HASH_LENGTH)
}

export function hashedName(name: string, content: Buffer): string {
  const extension = extname(name)
  const stem = name.slice(0, name.length - extension.length)
  return `${stem}.${sha256Prefix(content)}${extension}`
}

export function isAlreadyHashed(name: string, content: Buffer): boolean {
  const segment = HASH_SEGMENT.exec(name)?.[1]
  if (segment === undefined) return false
  if (segment !== sha256Prefix(content)) {
    throw new Error(`${name} has a hash segment that does not match its content`)
  }
  return true
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  })
}

function urlPath(outDir: string, file: string): string {
  return `/${relative(outDir, file).split(sep).join('/')}`
}

function hashedFiles(outDir: string): string[] {
  return HASHED_DIRS.flatMap((dir) => listFiles(join(outDir, dir)))
}

function isInHashedDir(outDir: string, file: string): boolean {
  const [top] = relative(outDir, file).split(sep)
  return HASHED_DIRS.some((dir) => dir === top)
}

function textFiles(outDir: string): string[] {
  return listFiles(outDir).filter(
    (file) => TEXT_EXTENSIONS.has(extname(file)) && !isInHashedDir(outDir, file),
  )
}

export function hashAssetFiles(outDir: string): Map<string, string> {
  const renames = new Map<string, string>()
  for (const file of hashedFiles(outDir)) {
    const name = file.slice(file.lastIndexOf(sep) + 1)
    const content = readFileSync(file)
    if (isAlreadyHashed(name, content)) continue
    const target = join(
      file.slice(0, file.length - name.length),
      hashedName(name, content),
    )
    renameSync(file, target)
    renames.set(urlPath(outDir, file), urlPath(outDir, target))
  }
  return renames
}

export function rewriteReferences(outDir: string, renames: Map<string, string>): number {
  let rewritten = 0
  for (const file of textFiles(outDir)) {
    const text = readFileSync(file, 'utf8')
    const next = text.replace(REFERENCE, (ref) => renames.get(ref) ?? ref)
    if (next === text) continue
    writeFileSync(file, next)
    rewritten += 1
  }
  return rewritten
}

function referencedPaths(outDir: string): Set<string> {
  const refs = new Set<string>()
  for (const file of textFiles(outDir)) {
    for (const ref of readFileSync(file, 'utf8').matchAll(REFERENCE)) refs.add(ref[0])
  }
  return refs
}

function unhashedPath(path: string): string {
  return path.replace(HASH_SEGMENT, (match, hash: string) =>
    match.replace(`.${hash}`, ''),
  )
}

export function verifyHashedOutput(
  outDir: string,
  kept: ReadonlySet<string> = KEPT_UNREFERENCED,
): string[] {
  const refs = referencedPaths(outDir)
  const onDisk = new Set(hashedFiles(outDir).map((file) => urlPath(outDir, file)))
  const originals = new Set([...onDisk].map(unhashedPath))
  const problems: string[] = []
  for (const ref of [...refs].sort()) {
    if (!HASH_SEGMENT.test(ref)) problems.push(`unhashed reference: ${ref}`)
    else if (!onDisk.has(ref)) problems.push(`missing file for reference: ${ref}`)
  }
  for (const file of [...onDisk].sort()) {
    const original = unhashedPath(file)
    if (refs.has(file) && kept.has(original)) {
      problems.push(`kept-unreferenced entry is referenced, remove it: ${original}`)
    } else if (!refs.has(file) && !kept.has(original)) {
      problems.push(
        `unreferenced file: ${file} (kept files are listed in ${REVIEW_LIST})`,
      )
    }
  }
  for (const entry of [...kept].sort()) {
    if (!originals.has(entry)) {
      problems.push(`kept-unreferenced entry has no file, remove it: ${entry}`)
    }
  }
  return problems
}

function main(): void {
  const renames = hashAssetFiles(OUT_DIR)
  const rewritten = rewriteReferences(OUT_DIR, renames)
  console.log(
    `hash-assets: renamed ${String(renames.size)} files, rewrote ${String(rewritten)} text files`,
  )
  const problems = verifyHashedOutput(OUT_DIR)
  if (problems.length > 0) {
    console.error(`hash-assets: ${String(problems.length)} problems`)
    for (const problem of problems) console.error(`  ${problem}`)
    process.exit(1)
  }
  console.log(
    'hash-assets: verified, every reference resolves and every file is used or kept',
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
