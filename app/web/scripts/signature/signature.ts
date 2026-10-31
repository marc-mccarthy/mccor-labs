const LAYOUTS = ['framed', 'card'] as const

export type Layout = (typeof LAYOUTS)[number]

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

export interface SignatureContext {
  assetBase: string
  siteUrl: string
  company: string
  tokens: Record<string, string>
}

export type Renderer = (
  template: string,
  person: Person,
  ctx: SignatureContext,
  hasPhoto: boolean,
) => string

interface Box {
  width: number
  height: number
}

interface LineStyle {
  size: number
  lineHeight: number
  gap: number
  bold: boolean
}

const TITLE_SEPARATOR = ' · '
const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif"
const PAD_TOP = 2
const PAD_BOTTOM = 4
const BUTTON_GAP = 7
const EMAIL_GAP = 2
const US_PREFIX = /^\+1\s+/

const FRAMED_PHOTO: Box = { width: 95, height: 131 }
const FRAMED_ICON: Box = { width: 24, height: 56 }
const FRAMED_LINES = {
  specialty: { size: 10, lineHeight: 13, gap: 6, bold: false },
  email: { size: 11, lineHeight: 14, gap: 0, bold: false },
  phone: { size: 11, lineHeight: 15, gap: 3, bold: false },
} satisfies Record<string, LineStyle>

const CARD_PHOTO: Box = { width: 103, height: 120 }
const CARD_ICON: Box = { width: 20, height: 20 }
const CARD_TEXT = 230
const CARD_TEXT_GAP = 18
const CARD_LINES = {
  specialty: { size: 13, lineHeight: 16, gap: 2, bold: false },
  email: { size: 13, lineHeight: 16, gap: 3, bold: true },
  phone: { size: 13, lineHeight: 16, gap: 2, bold: true },
} satisfies Record<string, LineStyle>

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

function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/{{(\w+)}}/g, (_, key: string) => {
    const value = values[key]
    if (value === undefined)
      throw new Error(`template placeholder {{${key}}} has no value`)
    return value
  })
}

function line(body: string, ink: string, style: LineStyle): string {
  const gap = style.gap > 0 ? `;padding-top:${String(style.gap)}px` : ''
  const weight = style.bold ? ';font-weight:700' : ''
  return `<div style="font-size:${String(style.size)}px;line-height:${String(style.lineHeight)}px;color:${ink}${gap}${weight}">${body}</div>\n`
}

function link(href: string, text: string, ink: string): string {
  return `<a href="${href}" style="color:${ink};text-decoration:none;font-weight:700">${text}</a>`
}

function emailLine(email: string, ink: string, style: LineStyle): string {
  const address = escapeHtml(email)
  return line(link(`mailto:${address}`, address, ink), ink, style)
}

function phoneLine(phone: string | undefined, ink: string, style: LineStyle): string {
  if (!phone) return ''
  const shown = escapeHtml(phone.replace(US_PREFIX, ''))
  return line(link(`tel:${phoneHref(phone)}`, shown, ink), ink, style)
}

function specialtyLine(specialty: string, ink: string, style: LineStyle): string {
  return specialty === '' ? '' : line(escapeHtml(specialty), ink, style)
}

function imageCell(src: string, alt: string, box: Box, valign: string): string {
  const { width, height } = box
  return `<td width="${String(width)}" valign="${valign}" style="width:${String(width)}px;line-height:0"><img src="${src}" width="${String(width)}" height="${String(height)}" alt="${alt}" style="display:block;border:0;width:${String(width)}px;height:${String(height)}px"></td>\n`
}

function buttonCell(booking: string, ctx: SignatureContext, padding: string): string {
  const red = requireToken(ctx.tokens, 'crimson-deep')
  const light = requireToken(ctx.tokens, 'text')
  return `<td bgcolor="${red}" style="background:${red};border-radius:3px;padding:${padding};font-family:${FONT};font-size:10px;line-height:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;white-space:nowrap"><a href="${escapeHtml(booking)}" style="color:${light};text-decoration:none">Book a call</a></td>`
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

function iconCell(
  src: string,
  icon: IconLink,
  gap: number,
  box: Box,
  valign: string,
): string {
  const { width, height } = box
  return `<td valign="${valign}" style="padding-left:${String(gap)}px;line-height:0"><a href="${escapeHtml(icon.href)}"><img src="${src}" width="${String(width)}" height="${String(height)}" alt="${icon.alt}" style="display:block;border:0;width:${String(width)}px;height:${String(height)}px"></a></td>`
}

function sharedValues(person: Person, ctx: SignatureContext): Record<string, string> {
  const [role = ''] = person.title.split(TITLE_SEPARATOR)
  return {
    assetBase: ctx.assetBase,
    font: FONT,
    base: requireToken(ctx.tokens, 'base'),
    text: requireToken(ctx.tokens, 'text'),
    crimson: requireToken(ctx.tokens, 'crimson-deep'),
    rule: requireToken(ctx.tokens, 'border-strong'),
    name: escapeHtml(person.name),
    roleLine: escapeHtml(`${role}, ${ctx.company}`),
  }
}

function specialtyOf(person: Person): string {
  return person.title.split(TITLE_SEPARATOR).slice(1).join(TITLE_SEPARATOR)
}

function framedIcons(person: Person, ctx: SignatureContext): string {
  const cells = iconLinks(person, ctx).map((icon, i) =>
    iconCell(
      `${ctx.assetBase}/icon-${icon.key}.gif`,
      icon,
      i === 0 ? 0 : 6,
      FRAMED_ICON,
      'bottom',
    ),
  )
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>\n${cells.join('\n')}\n</tr></table>`
}

function framedContact(person: Person, ctx: SignatureContext, ink: string): string {
  const crimson = requireToken(ctx.tokens, 'crimson-deep')
  const button = person.booking
    ? `<div style="padding-top:${String(BUTTON_GAP)}px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${buttonCell(person.booking, ctx, '6px 11px')}</tr></table></div>`
    : ''
  const valign = person.booking ? 'bottom' : 'top'
  const lines = `${emailLine(person.email, crimson, FRAMED_LINES.email)}${phoneLine(person.phone, ink, FRAMED_LINES.phone)}${button}`
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>\n<td valign="${valign}" style="padding:${String(EMAIL_GAP)}px 0 0 0">${lines}</td>\n<td valign="bottom" style="padding:0 0 0 12px;line-height:0">${framedIcons(person, ctx)}</td>\n</tr></table>\n`
}

export const renderSignature: Renderer = (template, person, ctx, hasPhoto) => {
  const ink = requireToken(ctx.tokens, 'base')
  return fillTemplate(template, {
    ...sharedValues(person, ctx),
    padTop: String(PAD_TOP),
    padBottom: String(PAD_BOTTOM),
    photoCell: hasPhoto
      ? imageCell(
          `${ctx.assetBase}/${person.slug}.png`,
          escapeHtml(person.name),
          FRAMED_PHOTO,
          'middle',
        )
      : '',
    specialtyRow: specialtyLine(specialtyOf(person), ink, FRAMED_LINES.specialty),
    contactBlock: framedContact(person, ctx, ink),
  })
}

function cardActions(person: Person, ctx: SignatureContext): string {
  const icons = iconLinks(person, ctx).map((icon, i) => {
    const gap = i > 0 ? 7 : person.booking ? 12 : 0
    return iconCell(
      `${ctx.assetBase}/card-icon-${icon.key}.png`,
      icon,
      gap,
      CARD_ICON,
      'middle',
    )
  })
  const button = person.booking ? [buttonCell(person.booking, ctx, '3px 11px 6px')] : []
  return `<div style="padding-top:4px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>\n${[...button, ...icons].join('\n')}\n</tr></table></div>\n`
}

function cardContact(person: Person, ctx: SignatureContext, ink: string): string {
  const crimson = requireToken(ctx.tokens, 'crimson-deep')
  return `${emailLine(person.email, crimson, CARD_LINES.email)}${phoneLine(person.phone, ink, CARD_LINES.phone)}${cardActions(person, ctx)}`
}

export const renderCardSignature: Renderer = (template, person, ctx, hasPhoto) => {
  const ink = requireToken(ctx.tokens, 'base')
  return fillTemplate(template, {
    ...sharedValues(person, ctx),
    accent: requireToken(ctx.tokens, 'accent'),
    textWidth: String(
      hasPhoto ? CARD_TEXT : CARD_TEXT + CARD_TEXT_GAP + CARD_PHOTO.width,
    ),
    textGap: String(hasPhoto ? CARD_TEXT_GAP : 0),
    photoCell: hasPhoto
      ? imageCell(
          `${ctx.assetBase}/${person.slug}-card.png`,
          escapeHtml(person.name),
          CARD_PHOTO,
          'top',
        )
      : '',
    specialtyRow: specialtyLine(specialtyOf(person), ink, CARD_LINES.specialty),
    contactBlock: cardContact(person, ctx, ink),
  })
}
