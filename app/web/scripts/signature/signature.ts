export interface Person {
  slug: string
  name: string
  title: string
  email: string
  phone?: string
  booking?: string
  website?: string
  linkedin?: string
  github?: string
  photo?: string
  layout?: Layout
}

const LAYOUTS = ['framed', 'card'] as const

export type Layout = (typeof LAYOUTS)[number]

export interface SignatureContext {
  assetBase: string
  siteUrl: string
  company: string
  tokens: Record<string, string>
}

const TITLE_SEPARATOR = ' · '
const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif"
const PAD_TOP = 2
const PAD_BOTTOM = 4
const BUTTON_GAP = 7
const EMAIL_GAP = 2
const US_PREFIX = /^\+1\s+/

const REQUIRED_KEYS = ['slug', 'name', 'title', 'email'] as const
const OPTIONAL_KEYS = [
  'phone',
  'booking',
  'website',
  'linkedin',
  'github',
  'photo',
  'layout',
] as const

export function readTokens(css: string): Record<string, string> {
  const block = /@theme\s*{([^}]*)}/.exec(css)?.[1]
  if (!block) throw new Error('globals.css has no @theme block')
  const tokens: Record<string, string> = {}
  for (const [, name, hex] of block.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})/gi)) {
    if (name && hex) tokens[name] = hex.toLowerCase()
  }
  return tokens
}

export function requireToken(tokens: Record<string, string>, name: string): string {
  const value = tokens[name]
  if (!value) throw new Error(`missing @theme token --color-${name}`)
  return value
}

export function parsePeople(json: string): Person[] {
  const data: unknown = JSON.parse(json)
  if (!Array.isArray(data) || data.length === 0)
    throw new Error('people must be a non-empty array')
  return data.map((entry, i) => {
    if (typeof entry !== 'object' || entry === null)
      throw new Error(`person ${String(i)} is not an object`)
    const record = entry as Record<string, unknown>
    const person: Record<string, string> = {}
    for (const key of REQUIRED_KEYS) {
      const value = record[key]
      if (typeof value !== 'string' || value === '')
        throw new Error(`person ${String(i)} needs a non-empty string "${key}"`)
      person[key] = value
    }
    for (const key of OPTIONAL_KEYS) {
      const value = record[key]
      if (value === undefined) continue
      if (typeof value !== 'string')
        throw new Error(`person ${String(i)} "${key}" must be a string`)
      if (key === 'layout' && !(LAYOUTS as readonly string[]).includes(value))
        throw new Error(
          `person ${String(i)} "layout" must be one of ${LAYOUTS.join(', ')}`,
        )
      person[key] = value
    }
    return person as unknown as Person
  })
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replace(/[^\x20-\x7e]/gu, (ch) => `&#${String(ch.codePointAt(0))};`)
}

export function phoneHref(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

function photoCell(person: Person, ctx: SignatureContext): string {
  const src = `${ctx.assetBase}/${person.slug}.png`
  return `<td width="95" valign="middle" style="width:95px;line-height:0"><img src="${src}" width="95" height="131" alt="${escapeHtml(person.name)}" style="display:block;border:0;width:95px;height:131px"></td>\n`
}

function specialtyRow(specialty: string, ink: string): string {
  if (specialty === '') return ''
  return `<div style="font-size:10px;line-height:13px;color:${ink};padding-top:6px">${escapeHtml(specialty)}</div>\n`
}

function phoneRow(phone: string | undefined, ink: string): string {
  if (!phone) return ''
  return `<div style="font-size:11px;line-height:15px;color:${ink};padding-top:3px"><a href="tel:${phoneHref(phone)}" style="color:${ink};text-decoration:none;font-weight:700">${escapeHtml(phone.replace(US_PREFIX, ''))}</a></div>\n`
}

function bookButton(booking: string, ctx: SignatureContext, gap: number): string {
  const red = requireToken(ctx.tokens, 'crimson-deep')
  const light = requireToken(ctx.tokens, 'text')
  return `<div style="padding-top:${String(gap)}px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${red}" style="background:${red};border-radius:3px;padding:6px 11px;font-family:${FONT};font-size:10px;line-height:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;white-space:nowrap"><a href="${escapeHtml(booking)}" style="color:${light};text-decoration:none">Book a call</a></td></tr></table></div>`
}

function iconCell(src: string, href: string, alt: string, gap: number): string {
  return `<td valign="bottom" style="padding-left:${String(gap)}px;line-height:0"><a href="${escapeHtml(href)}"><img src="${src}" width="24" height="56" alt="${alt}" style="display:block;border:0;width:24px;height:56px"></a></td>`
}

interface IconLink {
  href: string
  key: 'mccor' | 'linkedin' | 'github'
  alt: string
}

function iconLinks(person: Person, ctx: SignatureContext): IconLink[] {
  const website = person.website ?? ''
  const icons = [
    { href: website === '' ? ctx.siteUrl : website, key: 'mccor', alt: 'McCor Labs' },
    { href: person.linkedin, key: 'linkedin', alt: 'LinkedIn' },
    { href: person.github, key: 'github', alt: 'GitHub' },
  ] as const
  return icons.flatMap(({ href, key, alt }) => (href ? [{ href, key, alt }] : []))
}

function iconTable(person: Person, ctx: SignatureContext): string {
  const cells = iconLinks(person, ctx).map(({ href, key, alt }, i) =>
    iconCell(`${ctx.assetBase}/icon-${key}.gif`, href, alt, i === 0 ? 0 : 6),
  )
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>\n${cells.join('\n')}\n</tr></table>`
}

function emailRow(email: string, crimson: string): string {
  const address = escapeHtml(email)
  return `<div style="font-size:11px;line-height:14px;color:${crimson}"><a href="mailto:${address}" style="color:${crimson};text-decoration:none;font-weight:700">${address}</a></div>\n`
}

function contactBlock(person: Person, ctx: SignatureContext, ink: string): string {
  const crimson = requireToken(ctx.tokens, 'crimson-deep')
  const button = person.booking ? bookButton(person.booking, ctx, BUTTON_GAP) : ''
  const valign = person.booking ? 'bottom' : 'top'
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>\n<td valign="${valign}" style="padding:${String(EMAIL_GAP)}px 0 0 0">${emailRow(person.email, crimson)}${phoneRow(person.phone, ink)}${button}</td>\n<td valign="bottom" style="padding:0 0 0 12px;line-height:0">${iconTable(person, ctx)}</td>\n</tr></table>\n`
}

export function renderSignature(
  template: string,
  person: Person,
  ctx: SignatureContext,
  hasCard: boolean,
): string {
  const base = requireToken(ctx.tokens, 'base')
  const [role = '', ...rest] = person.title.split(TITLE_SEPARATOR)
  const values: Record<string, string> = {
    assetBase: ctx.assetBase,
    font: FONT,
    padTop: String(PAD_TOP),
    padBottom: String(PAD_BOTTOM),
    base,
    text: requireToken(ctx.tokens, 'text'),
    crimson: requireToken(ctx.tokens, 'crimson-deep'),
    rule: requireToken(ctx.tokens, 'border-strong'),
    name: escapeHtml(person.name),
    roleLine: escapeHtml(`${role}, ${ctx.company}`),
    photoCell: hasCard ? photoCell(person, ctx) : '',
    specialtyRow: specialtyRow(rest.join(TITLE_SEPARATOR), base),
    contactBlock: contactBlock(person, ctx, base),
  }
  return fillTemplate(template, values)
}

function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/{{(\w+)}}/g, (_, key: string) => {
    const value = values[key]
    if (value === undefined)
      throw new Error(`template placeholder {{${key}}} has no value`)
    return value
  })
}

function cardPhotoCell(person: Person, ctx: SignatureContext): string {
  const src = `${ctx.assetBase}/${person.slug}-card.png`
  return `<td width="103" valign="top" style="width:103px;line-height:0"><img src="${src}" width="103" height="120" alt="${escapeHtml(person.name)}" style="display:block;border:0;width:103px;height:120px"></td>\n`
}

function cardLine(text: string, ink: string, gap: number, href?: string): string {
  const body = href
    ? `<a href="${href}" style="color:${ink};text-decoration:none;font-weight:700">${text}</a>`
    : text
  const weight = href ? ';font-weight:700' : ''
  return `<div style="font-size:13px;line-height:16px;color:${ink};padding-top:${String(gap)}px${weight}">${body}</div>\n`
}

function cardButton(booking: string, ctx: SignatureContext): string {
  const red = requireToken(ctx.tokens, 'crimson-deep')
  const light = requireToken(ctx.tokens, 'text')
  return `<td valign="middle" bgcolor="${red}" style="background:${red};border-radius:3px;padding:3px 11px 6px;font-family:${FONT};font-size:10px;line-height:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;white-space:nowrap"><a href="${escapeHtml(booking)}" style="color:${light};text-decoration:none">Book a call</a></td>`
}

function cardActions(person: Person, ctx: SignatureContext): string {
  const icons = iconLinks(person, ctx).map(({ href, key, alt }, i) => {
    const gap = i > 0 ? 7 : person.booking ? 12 : 0
    return `<td valign="middle" style="padding-left:${String(gap)}px;line-height:0"><a href="${escapeHtml(href)}"><img src="${ctx.assetBase}/card-icon-${key}.png" width="20" height="20" alt="${alt}" style="display:block;border:0;width:20px;height:20px"></a></td>`
  })
  const cells = [...(person.booking ? [cardButton(person.booking, ctx)] : []), ...icons]
  return `<div style="padding-top:4px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>\n${cells.join('\n')}\n</tr></table></div>\n`
}

function cardContact(person: Person, ctx: SignatureContext, ink: string): string {
  const crimson = requireToken(ctx.tokens, 'crimson-deep')
  const address = escapeHtml(person.email)
  const phone = person.phone
    ? cardLine(
        escapeHtml(person.phone.replace(US_PREFIX, '')),
        ink,
        2,
        `tel:${phoneHref(person.phone)}`,
      )
    : ''
  return `${cardLine(address, crimson, 3, `mailto:${address}`)}${phone}${cardActions(person, ctx)}`
}

export function renderCardSignature(
  template: string,
  person: Person,
  ctx: SignatureContext,
  hasPhoto: boolean,
): string {
  const base = requireToken(ctx.tokens, 'base')
  const [role = '', ...rest] = person.title.split(TITLE_SEPARATOR)
  const specialty = rest.join(TITLE_SEPARATOR)
  return fillTemplate(template, {
    assetBase: ctx.assetBase,
    font: FONT,
    base,
    text: requireToken(ctx.tokens, 'text'),
    accent: requireToken(ctx.tokens, 'accent'),
    crimson: requireToken(ctx.tokens, 'crimson-deep'),
    rule: requireToken(ctx.tokens, 'border-strong'),
    name: escapeHtml(person.name),
    roleLine: escapeHtml(`${role}, ${ctx.company}`),
    photoCell: hasPhoto ? cardPhotoCell(person, ctx) : '',
    specialtyRow: specialty === '' ? '' : cardLine(escapeHtml(specialty), base, 2),
    contactBlock: cardContact(person, ctx, base),
  })
}
