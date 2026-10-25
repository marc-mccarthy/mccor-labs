import { createHash } from 'node:crypto'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  hashAssetFiles,
  hashedName,
  isAlreadyHashed,
  rewriteReferences,
  verifyHashedOutput,
} from './hash-assets'

const VIDEO = Buffer.from('video-bytes')
const FONT = Buffer.from('font-bytes')

function prefix(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 8)
}

const NONE: ReadonlySet<string> = new Set()

let out = ''

function write(path: string, content: string | Buffer): void {
  const file = join(out, path)
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, content)
}

function fixture(): void {
  write('media/brand/hero-loop.webm', VIDEO)
  write('fonts/geist.woff2', FONT)
  write(
    'index.html',
    '<video src="/media/brand/hero-loop.webm"></video><link href="/fonts/geist.woff2">',
  )
  write('_next/static/chunks/app.js', 'fetch("/media/brand/hero-loop.webm")')
  write('_next/static/media/other.woff2', 'next-font')
}

beforeEach(() => {
  out = mkdtempSync(join(tmpdir(), 'hash-assets-'))
})

afterEach(() => {
  rmSync(out, { recursive: true, force: true })
})

describe('hashedName', () => {
  it('inserts the first 8 hex of the sha256 before the extension', () => {
    expect(hashedName('hero-loop.webm', VIDEO)).toBe(`hero-loop.${prefix(VIDEO)}.webm`)
    expect(hashedName('hero-loop.webm', VIDEO)).toMatch(/^hero-loop\.[0-9a-f]{8}\.webm$/)
  })
})

describe('isAlreadyHashed', () => {
  it('detects a matching hash segment', () => {
    expect(isAlreadyHashed(`a.${prefix(VIDEO)}.webm`, VIDEO)).toBe(true)
    expect(isAlreadyHashed('a.webm', VIDEO)).toBe(false)
  })

  it('refuses a hash segment that does not match the content', () => {
    expect(() => isAlreadyHashed('a.deadbeef.webm', VIDEO)).toThrow(/does not match/)
  })
})

describe('hashAssetFiles and rewriteReferences', () => {
  it('renames media and fonts files and rewrites every literal reference', () => {
    fixture()
    const renames = hashAssetFiles(out)
    const video = `/media/brand/hero-loop.${prefix(VIDEO)}.webm`
    const font = `/fonts/geist.${prefix(FONT)}.woff2`

    expect(renames.get('/media/brand/hero-loop.webm')).toBe(video)
    expect(renames.get('/fonts/geist.woff2')).toBe(font)
    expect(existsSync(join(out, video))).toBe(true)
    expect(existsSync(join(out, 'media/brand/hero-loop.webm'))).toBe(false)

    expect(rewriteReferences(out, renames)).toBe(2)
    expect(readFileSync(join(out, 'index.html'), 'utf8')).toBe(
      `<video src="${video}"></video><link href="${font}">`,
    )
    expect(readFileSync(join(out, '_next/static/chunks/app.js'), 'utf8')).toBe(
      `fetch("${video}")`,
    )
    expect(verifyHashedOutput(out, NONE)).toEqual([])
  })

  it('leaves /_next/static/media references alone', () => {
    fixture()
    write('index.html', '<link href="/_next/static/media/other.woff2">')
    rewriteReferences(out, hashAssetFiles(out))
    expect(readFileSync(join(out, 'index.html'), 'utf8')).toBe(
      '<link href="/_next/static/media/other.woff2">',
    )
  })

  it('does not double-hash on a second run', () => {
    fixture()
    rewriteReferences(out, hashAssetFiles(out))
    const html = readFileSync(join(out, 'index.html'), 'utf8')

    const second = hashAssetFiles(out)
    expect(second.size).toBe(0)
    expect(rewriteReferences(out, second)).toBe(0)
    expect(readFileSync(join(out, 'index.html'), 'utf8')).toBe(html)
    expect(verifyHashedOutput(out, NONE)).toEqual([])
  })
})

describe('verifyHashedOutput', () => {
  it('fails on a reference that is unhashed', () => {
    fixture()
    const renames = hashAssetFiles(out)
    rewriteReferences(out, renames)
    write('about.html', '<img src="/media/brand/hero-loop.webm">')
    expect(verifyHashedOutput(out, NONE)).toEqual([
      'unhashed reference: /media/brand/hero-loop.webm',
    ])
  })

  it('fails on a hashed reference to a missing file', () => {
    fixture()
    rewriteReferences(out, hashAssetFiles(out))
    write('about.html', '<img src="/media/brand/gone.1a2b3c4d.webp">')
    expect(verifyHashedOutput(out, NONE)).toEqual([
      'missing file for reference: /media/brand/gone.1a2b3c4d.webp',
    ])
  })

  it('fails on a hashed file nothing references', () => {
    fixture()
    write('media/brand/dead.webp', 'dead')
    rewriteReferences(out, hashAssetFiles(out))
    expect(verifyHashedOutput(out, NONE)).toEqual([
      `unreferenced file: /media/brand/dead.${prefix(Buffer.from('dead'))}.webp (kept files are listed in docs/unused-brand-media.md)`,
    ])
  })

  it('passes an unreferenced file that is in the kept set', () => {
    fixture()
    write('media/brand/dead.webp', 'dead')
    rewriteReferences(out, hashAssetFiles(out))
    expect(verifyHashedOutput(out, new Set(['/media/brand/dead.webp']))).toEqual([])
  })

  it('fails a kept entry that is now referenced', () => {
    fixture()
    rewriteReferences(out, hashAssetFiles(out))
    expect(verifyHashedOutput(out, new Set(['/media/brand/hero-loop.webm']))).toEqual([
      'kept-unreferenced entry is referenced, remove it: /media/brand/hero-loop.webm',
    ])
  })

  it('fails a kept entry whose file is gone', () => {
    fixture()
    rewriteReferences(out, hashAssetFiles(out))
    expect(verifyHashedOutput(out, new Set(['/media/brand/gone.webp']))).toEqual([
      'kept-unreferenced entry has no file, remove it: /media/brand/gone.webp',
    ])
  })
})
