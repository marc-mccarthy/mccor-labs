import { describe, expect, it } from 'vitest'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { portraits } from './portraits'

const PUBLIC = join(import.meta.dirname, '..', '..', 'public')

describe('portraits', () => {
  it('has a published portrait only for nateb', () => {
    expect(Object.keys(portraits)).toEqual(['nateb'])
  })

  it('has no entry for people whose source photo is not a usable headshot', () => {
    expect(portraits.marcm).toBeUndefined()
    expect(portraits.ashleyt).toBeUndefined()
    expect(portraits.mariem).toBeUndefined()
  })

  it('sizes nateb at 320x400, a 4:5 ratio', () => {
    expect(portraits.nateb?.width).toBe(320)
    expect(portraits.nateb?.height).toBe(400)
    expect((portraits.nateb?.width ?? 0) / (portraits.nateb?.height ?? 1)).toBeCloseTo(
      0.8,
      2,
    )
  })

  it('emits both avif and webp for nateb', () => {
    expect(existsSync(join(PUBLIC, portraits.nateb?.avif ?? ''))).toBe(true)
    expect(existsSync(join(PUBLIC, portraits.nateb?.webp ?? ''))).toBe(true)
  })

  it('publishes no file larger than 40kB', () => {
    for (const variant of ['avif', 'webp'] as const) {
      const path = portraits.nateb?.[variant]
      expect(path).toBeDefined()
      expect(statSync(join(PUBLIC, path ?? '')).size).toBeLessThan(40_000)
    }
  })

  it('publishes no source-resolution original', () => {
    expect(existsSync(join(PUBLIC, 'media', 'team', 'nateb.jpg'))).toBe(false)
  })

  it('strips all metadata from every published variant', async () => {
    const sharp = (await import('sharp')).default
    for (const variant of ['avif', 'webp'] as const) {
      const path = portraits.nateb?.[variant]
      expect(path).toBeDefined()
      const meta = await sharp(join(PUBLIC, path ?? '')).metadata()
      expect(meta.exif).toBeUndefined()
      expect(meta.iptc).toBeUndefined()
      expect(meta.xmp).toBeUndefined()
    }
  })
})
