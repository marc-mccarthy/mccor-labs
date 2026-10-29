import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  type Person,
  type SignatureContext,
  escapeHtml,
  parsePeople,
  phoneHref,
  readTokens,
  renderSignature,
} from './signature'

const css = readFileSync(
  join(import.meta.dirname, '..', '..', 'src', 'styles', 'globals.css'),
  'utf8',
)
const template = readFileSync(join(import.meta.dirname, 'template.html'), 'utf8')

const ctx: SignatureContext = {
  assetBase: 'https://mccorlabs.com/sig/framed',
  siteUrl: 'https://mccorlabs.com',
  company: 'McCor Labs',
  tokens: readTokens(css),
}

const person: Person = {
  slug: 'marcm',
  name: 'Marc <McCarthy>',
  title: 'Founder · Full-Stack & AI Engineer',
  email: 'marcm@mccorlabs.com',
  phone: '+1 (612) 555-0123',
  booking: 'https://cal.com/mccorlabs',
  website: 'https://example.com',
  linkedin: 'https://www.linkedin.com/in/marc',
  github: 'https://github.com/marc-mccarthy',
  photo: 'marcm',
}

const minimal: Person = {
  slug: 'nateb',
  name: 'Nate Best',
  title: 'Consultation Specialist',
  email: 'nateb@mccorlabs.com',
}

const render = (p: Person, hasCard = true) => renderSignature(template, p, ctx, hasCard)
const flat = (html: string) => html.replace(/\s+/g, ' ').replace(/" >/g, '">')

describe('readTokens', () => {
  it('reads every colour token from the @theme block', () => {
    expect(ctx.tokens.base).toMatch(/^#[0-9a-f]{6}$/)
    expect(ctx.tokens['crimson-deep']).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('phoneHref', () => {
  it('keeps only digits and the plus sign', () => {
    expect(phoneHref('+1 (612) 555-0123')).toBe('+16125550123')
  })
})

describe('escapeHtml', () => {
  it('escapes markup characters', () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;',
    )
  })

  it('keeps astral characters as one entity', () => {
    expect(escapeHtml('A😀')).toBe('A&#128512;')
  })
})

describe('renderSignature', () => {
  const html = render(person)

  it('fills every placeholder', () => {
    expect(html).not.toMatch(/{{\w+}}/)
    expect(render(minimal, false)).not.toMatch(/{{\w+}}/)
  })

  it('keeps the stable root id and 561px width', () => {
    expect(flat(html)).toContain('<table id="sig"')
    expect(html).toContain('width="561"')
  })

  it('escapes person fields', () => {
    expect(html).toContain('Marc &lt;McCarthy&gt;')
  })

  it('emits only ASCII so mail clients cannot mis-decode it', () => {
    const accented = render({ ...person, name: 'Zoë Müller' })
    expect(accented).toContain('Zo&#235; M&#252;ller')
    expect(accented).toMatch(/^[\x00-\x7e]*$/)
  })

  it('links the framed assets and the per-person card', () => {
    expect(html).toContain('https://mccorlabs.com/sig/framed/frame-tl.gif')
    expect(html).toContain('https://mccorlabs.com/sig/framed/crest.gif')
    expect(html).toContain('https://mccorlabs.com/sig/framed/marcm.png')
    expect(html).toContain('https://mccorlabs.com/sig/framed/icon-mccor.gif')
  })

  it('splits the role from the specialty line', () => {
    expect(html).toContain('Founder, McCor Labs')
    expect(html).toContain('Full-Stack &amp; AI Engineer')
    const plain = render({ ...person, title: 'Designer' })
    expect(plain).toContain('Designer, McCor Labs')
    expect(plain).not.toContain('padding-top:2px">Designer')
  })

  it('sets the email in crimson-deep and bold', () => {
    const crimson = ctx.tokens['crimson-deep'] ?? ''
    expect(flat(html)).toContain(
      `<a href="mailto:marcm@mccorlabs.com" style="color:${crimson};text-decoration:none;font-weight:700">`,
    )
  })

  it('links the phone below the email without the US country code on display', () => {
    expect(html).toContain('href="tel:+16125550123"')
    expect(html).toContain('>(612) 555-0123</a>')
    expect(html.indexOf('mailto:')).toBeLessThan(html.indexOf('tel:'))
  })

  it('shows non-US numbers as stored', () => {
    expect(render({ ...person, phone: '+44 20 7946 0958' })).toContain(
      '>+44 20 7946 0958</a>',
    )
  })

  it('keeps the role line and crest alt as in the reference', () => {
    expect(flat(html)).toContain('font-weight:700;padding-top:3px"> Founder, McCor Labs')
    expect(html).toContain('alt="McCarthy coat of arms"')
  })

  it('shows the booking button and the three icons in order', () => {
    expect(html).toContain('href="https://cal.com/mccorlabs"')
    expect(html).toContain('Book a call')
    const order = ['icon-mccor', 'icon-linkedin', 'icon-github'].map((n) =>
      html.indexOf(n),
    )
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(order).not.toContain(-1)
    expect(html).toContain('width="24" height="56"')
  })

  it('puts the icons in a cell beside the phone and button', () => {
    expect(flat(html)).toMatch(
      /tel:.*padding-top:15px.*Book a call.*<\/div><\/td> <td valign="bottom" style="padding:0 0 0 12px;line-height:0"><table.*icon-mccor\.gif/,
    )
  })

  it('drops the gap above the button when there is no phone', () => {
    expect(flat(render({ ...person, phone: '' }))).toContain(
      '<div style="padding-top:0px"><table',
    )
  })

  it('puts the icons in a cell beside the phone when there is no booking', () => {
    const plain = flat(render({ ...person, booking: '' }))
    expect(plain).not.toContain('Book a call')
    expect(plain).toMatch(
      /tel:.*<\/a><\/div> <\/td> <td valign="bottom" style="padding:0 0 0 12px;line-height:0"><table.*icon-mccor\.gif/,
    )
  })

  it('shows only the icons when there is no phone and no booking', () => {
    const bare = flat(render({ ...person, phone: '', booking: '' }))
    expect(bare).not.toContain('tel:')
    expect(bare).not.toContain('padding:0 0 0 12px')
    expect(bare).toContain('icon-mccor.gif')
  })

  it('fits the 561 by 200 frame', () => {
    const f = flat(html)
    expect(f).toContain('height="149"')
    expect(f).toContain('width="99" height="137"')
    expect(f).toContain('width="127" height="141"')
  })

  it('links the mccor icon to the website', () => {
    expect(html).toContain(
      '<a href="https://example.com"><img src="https://mccorlabs.com/sig/framed/icon-mccor.gif"',
    )
  })

  it('falls back to the site url when there is no website', () => {
    expect(render(minimal)).toContain(
      '<a href="https://mccorlabs.com"><img src="https://mccorlabs.com/sig/framed/icon-mccor.gif"',
    )
  })

  it('omits phone, booking, linkedin and github when missing', () => {
    const bare = render(minimal)
    expect(bare).not.toContain('tel:')
    expect(bare).not.toContain('Book a call')
    expect(bare).not.toContain('icon-linkedin')
    expect(bare).not.toContain('icon-github')
    expect(bare).toContain('icon-mccor')
  })

  it('treats empty strings as missing', () => {
    const blank = render({ ...person, phone: '', booking: '', linkedin: '', github: '' })
    expect(blank).not.toContain('tel:')
    expect(blank).not.toContain('Book a call')
    expect(blank).not.toContain('icon-linkedin')
    expect(blank).not.toContain('icon-github')
  })

  it('omits the photo cell when there is no card', () => {
    expect(render(person, false)).not.toContain('marcm.png')
  })

  it('uses only theme colours', () => {
    const used = new Set(html.match(/#[0-9a-f]{6}/gi)?.map((hex) => hex.toLowerCase()))
    expect(used.size).toBeGreaterThan(0)
    for (const hex of used) expect(Object.values(ctx.tokens)).toContain(hex)
    expect(template).not.toMatch(/#[0-9a-f]{3,6}\b/i)
  })

  it('fails on an unknown placeholder', () => {
    expect(() => renderSignature('{{nope}}', person, ctx, true)).toThrow('{{nope}}')
  })
})

describe('parsePeople', () => {
  it('accepts required keys only', () => {
    expect(parsePeople(JSON.stringify([minimal]))).toEqual([minimal])
  })

  it('accepts every optional key', () => {
    expect(parsePeople(JSON.stringify([person]))).toEqual([person])
  })

  it('ignores unknown keys', () => {
    const [parsed] = parsePeople(
      JSON.stringify([{ ...minimal, facebook: 'https://fb.example' }]),
    )
    expect(parsed).toEqual(minimal)
  })

  it.each(['slug', 'name', 'title', 'email'] as const)('rejects a missing %s', (key) => {
    const broken = Object.fromEntries(Object.entries(minimal).filter(([k]) => k !== key))
    expect(() => parsePeople(JSON.stringify([broken]))).toThrow(`"${key}"`)
  })

  it('rejects a non-string required value', () => {
    expect(() => parsePeople(JSON.stringify([{ ...minimal, name: 4 }]))).toThrow('"name"')
  })

  it('rejects a non-string optional value', () => {
    expect(() => parsePeople(JSON.stringify([{ ...minimal, phone: 4 }]))).toThrow(
      '"phone"',
    )
  })

  it('rejects an empty list', () => {
    expect(() => parsePeople('[]')).toThrow('non-empty')
  })
})
