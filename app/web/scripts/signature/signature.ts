export interface Person {
  slug: string
  name: string
  title: string
  phone: string
  email: string
  linkedin: string
  facebook: string
  photo: string
}

export interface SignatureContext {
  assetBase: string
  siteUrl: string
  bookingUrl: string
  slogan: string
  tokens: Record<string, string>
}

const TOKEN_KEYS = {
  base: 'base',
  border: 'border',
  borderStrong: 'border-strong',
  muted: 'muted',
  text: 'text',
  link: 'crimson',
} as const

const SOCIAL = [
  { key: 'linkedin', file: 'linkedin.png', alt: 'LinkedIn' },
  { key: 'facebook', file: 'facebook.png', alt: 'Facebook' },
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

const PERSON_KEYS: readonly (keyof Person)[] = [
  'slug',
  'name',
  'title',
  'phone',
  'email',
  'linkedin',
  'facebook',
  'photo',
]

export function parsePeople(json: string): Person[] {
  const data: unknown = JSON.parse(json)
  if (!Array.isArray(data) || data.length === 0)
    throw new Error('people must be a non-empty array')
  return data.map((entry, i) => {
    if (typeof entry !== 'object' || entry === null)
      throw new Error(`person ${String(i)} is not an object`)
    const record = entry as Record<string, unknown>
    for (const key of PERSON_KEYS) {
      if (typeof record[key] !== 'string')
        throw new Error(`person ${String(i)} needs a string "${key}"`)
    }
    return record as unknown as Person
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

export function socialCells(person: Person, ctx: SignatureContext): string {
  const muted = requireToken(ctx.tokens, 'muted')
  return SOCIAL.filter(({ key }) => person[key] !== '')
    .map(
      ({ key, file, alt }) =>
        `<td style="padding:0 8px 0 0;vertical-align:middle;line-height:0;"><a href="${escapeHtml(person[key])}" style="color:${muted};text-decoration:none;"><img src="${ctx.assetBase}/${file}" width="20" height="20" alt="${alt}" style="display:block;width:20px;height:20px;border:0;"></a></td>`,
    )
    .join('\n          ')
}

export function renderSignature(
  template: string,
  person: Person,
  ctx: SignatureContext,
): string {
  const values: Record<string, string> = {
    assetBase: ctx.assetBase,
    siteUrl: ctx.siteUrl,
    bookingUrl: ctx.bookingUrl,
    slogan: escapeHtml(ctx.slogan),
    slug: person.slug,
    name: escapeHtml(person.name),
    title: escapeHtml(person.title),
    phoneCell:
      person.phone === ''
        ? ''
        : `<a href="tel:${phoneHref(person.phone)}" style="color:${requireToken(ctx.tokens, 'muted')};text-decoration:none;">${escapeHtml(person.phone)}</a>&nbsp;&middot;&nbsp;`,
    email: escapeHtml(person.email),
    socialCells: socialCells(person, ctx),
  }
  for (const [key, token] of Object.entries(TOKEN_KEYS)) {
    values[key] = requireToken(ctx.tokens, token)
  }
  return template.replace(/{{(\w+)}}/g, (_, key: string) => {
    const value = values[key]
    if (value === undefined)
      throw new Error(`template placeholder {{${key}}} has no value`)
    return value
  })
}
