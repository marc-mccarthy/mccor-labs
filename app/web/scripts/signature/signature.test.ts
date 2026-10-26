import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  type Person,
  type SignatureContext,
  parsePeople,
  phoneHref,
  readTokens,
  renderSignature,
  socialCells,
} from './signature'

const css = readFileSync(
  join(import.meta.dirname, '..', '..', 'src', 'styles', 'globals.css'),
  'utf8',
)
const template = readFileSync(join(import.meta.dirname, 'template.html'), 'utf8')

const ctx: SignatureContext = {
  assetBase: 'https://mccorlabs.com/sig',
  siteUrl: 'https://mccorlabs.com',
  bookingUrl: 'https://example.com/book',
  slogan: 'Swift & Sure',
  tokens: readTokens(css),
}

const person: Person = {
  slug: 'marcm',
  name: 'Marc <McCarthy>',
  title: 'Founder',
  phone: '+1 (612) 555-0123',
  email: 'marcm@mccorlabs.com',
  linkedin: 'https://www.linkedin.com/in/marc',
  facebook: '',
  photo: 'marcm',
}

describe('readTokens', () => {
  it('reads every colour token from the @theme block', () => {
    expect(ctx.tokens.base).toMatch(/^#[0-9a-f]{6}$/)
    expect(ctx.tokens.pine).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('phoneHref', () => {
  it('keeps only digits and the plus sign', () => {
    expect(phoneHref('+1 (612) 555-0123')).toBe('+16125550123')
  })
})

describe('socialCells', () => {
  it('omits blank networks', () => {
    const cells = socialCells(person, ctx)
    expect(cells).toContain('linkedin.png')
    expect(cells).not.toContain('facebook.png')
  })
})

describe('renderSignature', () => {
  const html = renderSignature(template, person, ctx)

  it('fills every placeholder', () => {
    expect(html).not.toMatch(/{{\w+}}/)
  })

  it('escapes person fields and encodes the slogan', () => {
    expect(html).toContain('Marc &lt;McCarthy&gt;')
    expect(html).toContain('Swift &amp; Sure')
  })

  it('emits only ASCII so mail clients cannot mis-decode it', () => {
    const withDot = renderSignature(
      template,
      { ...person, title: 'Founder · Engineer' },
      ctx,
    )
    expect(withDot).toContain('Founder &#183; Engineer')
    expect(withDot).toMatch(/^[\x00-\x7e]*$/)
  })

  it('links the per-person hosted images', () => {
    expect(html).toContain('https://mccorlabs.com/sig/name-marcm.png')
    expect(html).toContain('https://mccorlabs.com/sig/photo-marcm.jpg')
    expect(html).toContain('href="tel:+16125550123"')
  })

  it('uses only theme colours', () => {
    const used = new Set(html.match(/#[0-9a-f]{6}/gi)?.map((hex) => hex.toLowerCase()))
    for (const hex of used) expect(Object.values(ctx.tokens)).toContain(hex)
  })

  it('fails on an unknown placeholder', () => {
    expect(() => renderSignature('{{nope}}', person, ctx)).toThrow('{{nope}}')
  })
})

describe('parsePeople', () => {
  it('accepts a complete array', () => {
    expect(parsePeople(JSON.stringify([person]))).toHaveLength(1)
  })

  it('rejects a missing field', () => {
    const broken: Partial<Person> = { ...person }
    delete broken.phone
    expect(() => parsePeople(JSON.stringify([broken]))).toThrow('"phone"')
  })

  it('rejects an empty list', () => {
    expect(() => parsePeople('[]')).toThrow('non-empty')
  })
})

describe('blank phone', () => {
  it('drops the phone and its separator', () => {
    const html = renderSignature(template, { ...person, phone: '' }, ctx)
    expect(html).not.toContain('tel:')
    expect(html).not.toContain('&middot;&nbsp;<a href="mailto:')
  })
})
