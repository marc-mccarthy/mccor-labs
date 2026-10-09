import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { portraits, type Portrait } from './portraits'

const PUBLIC = join(import.meta.dirname, '..', '..', 'public')
const TEAM_DIR = join(PUBLIC, 'media', 'team')
const SLUGS = ['marcm', 'nateb', 'ashleyt', 'mariem'] as const

function entries(): [string, Portrait][] {
  return Object.entries(portraits).filter((entry): entry is [string, Portrait] =>
    Boolean(entry[1]),
  )
}

describe('portraits', () => {
  it('has a published portrait for every team member', () => {
    expect(Object.keys(portraits)).toEqual([...SLUGS])
  })

  it('sizes every portrait at 320x400, a 4:5 ratio', () => {
    for (const [, portrait] of entries()) {
      expect(portrait.width).toBe(320)
      expect(portrait.height).toBe(400)
      expect(portrait.width / portrait.height).toBeCloseTo(0.8, 2)
    }
  })

  it('emits both avif and webp for every portrait', () => {
    for (const [, portrait] of entries()) {
      expect(existsSync(join(PUBLIC, portrait.avif))).toBe(true)
      expect(existsSync(join(PUBLIC, portrait.webp))).toBe(true)
    }
  })

  it('publishes no file larger than 40kB', () => {
    for (const [, portrait] of entries()) {
      for (const variant of ['avif', 'webp'] as const) {
        expect(statSync(join(PUBLIC, portrait[variant])).size).toBeLessThan(40_000)
      }
    }
  })

  it('publishes no source-resolution original', () => {
    const originals = readdirSync(TEAM_DIR).filter((file) => /\.(jpe?g|png)$/i.test(file))
    expect(originals).toEqual([])
  })

  it('strips all metadata from every published variant', async () => {
    const sharp = (await import('sharp')).default
    for (const [, portrait] of entries()) {
      for (const variant of ['avif', 'webp'] as const) {
        const meta = await sharp(join(PUBLIC, portrait[variant])).metadata()
        expect(meta.exif).toBeUndefined()
        expect(meta.iptc).toBeUndefined()
        expect(meta.xmp).toBeUndefined()
      }
    }
  })
})
