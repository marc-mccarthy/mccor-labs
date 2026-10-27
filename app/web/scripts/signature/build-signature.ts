import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import {
  type Person,
  type SignatureContext,
  escapeHtml,
  parsePeople,
  readTokens,
  renderSignature,
  requireToken,
} from './signature'

const HERE = import.meta.dirname
const WEB = join(HERE, '..', '..')
const OUT_HTML = join(WEB, 'signatures')
const OUT_ASSETS = join(WEB, 'public', 'sig')
const TEAM_DIR = join(WEB, 'public', 'media', 'team')
const ASSET_BASE = 'https://mccorlabs.com/sig'
const SITE_URL = 'https://mccorlabs.com'
const BOOKING_FALLBACK = 'https://mccorlabs.com/contact'

const FONTS = {
  holland: { file: 'Holland.ttf', size: 28, lift: 0 },
} as const
type FontKey = keyof typeof FONTS
const DEFAULT_FONT: FontKey = 'holland'

const NAME_W = 200
const NAME_H = 36
const PHOTO_W = 96
const PHOTO_H = 120
const PHOTO_RADIUS = 8
const ICON = 16
const SCALE = 2

const ICON_PATHS = {
  linkedin:
    'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM10 9h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V21h-4z',
  facebook:
    'M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21z',
  github:
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
} as const

const ICON_INSET: Partial<Record<keyof typeof ICON_PATHS, string>> = {
  github: 'translate(3.6 3.6) scale(0.7)',
}

function pickFont(): FontKey {
  const flag = process.argv.indexOf('--font')
  const key = flag === -1 ? DEFAULT_FONT : (process.argv[flag + 1] ?? '')
  if (!(key in FONTS))
    throw new Error(`unknown font ${key}; use ${Object.keys(FONTS).join(' or ')}`)
  return key as FontKey
}

async function renderNames(people: readonly Person[], font: FontKey, color: string) {
  const spec = FONTS[font]
  const fontData = readFileSync(join(HERE, 'fonts', spec.file)).toString('base64')
  const fontUrl = `data:font/ttf;base64,${fontData}`
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: NAME_W, height: NAME_H },
    deviceScaleFactor: SCALE,
  })
  for (const person of people) {
    await page.setContent(
      String.raw`<style>@font-face{font-family:sig;src:url("${fontUrl}")}html,body{margin:0;background:transparent}div{font-family:sig;font-size:${spec.size}px;line-height:${NAME_H}px;height:${NAME_H}px;color:${color};white-space:nowrap;padding-left:6px;margin-top:${spec.lift}px}</style><div>${escapeHtml(person.name)}</div>`,
    )
    await page.evaluate(() => document.fonts.ready)
    if (!(await page.evaluate(() => document.fonts.check('12px sig'))))
      throw new Error('signature font failed to load')
    await page.screenshot({
      path: join(OUT_ASSETS, `name-${person.slug}.png`),
      omitBackground: true,
    })
  }
  await browser.close()
}

function roundedMask(w: number, h: number, r: number): Buffer {
  return Buffer.from(
    String.raw`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`,
  )
}

async function renderPhoto(person: Person): Promise<void> {
  const w = PHOTO_W * SCALE
  const h = PHOTO_H * SCALE
  await sharp(join(TEAM_DIR, `${person.photo}.webp`))
    .resize(w, h, { fit: 'cover' })
    .composite([{ input: roundedMask(w, h, PHOTO_RADIUS * SCALE), blend: 'dest-in' }])
    .png()
    .toFile(join(OUT_ASSETS, `photo-${person.slug}.png`))
}

async function renderIcon(
  name: keyof typeof ICON_PATHS,
  color: string,
  glyph: string,
): Promise<void> {
  const svg = String.raw`<svg xmlns="http://www.w3.org/2000/svg" width="${ICON * SCALE}" height="${ICON * SCALE}" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="${color}"/><path d="${ICON_PATHS[name]}" fill="${glyph}"${ICON_INSET[name] ? ` transform="${ICON_INSET[name]}"` : ''}/></svg>`
  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(OUT_ASSETS, `${name}.png`))
}

async function main(): Promise<void> {
  const font = pickFont()
  const tokens = readTokens(
    readFileSync(join(WEB, 'src', 'styles', 'globals.css'), 'utf8'),
  )
  const people = parsePeople(
    process.env.TEAM_MEMBERS ?? readFileSync(join(HERE, 'people.json'), 'utf8'),
  )
  const template = readFileSync(join(HERE, 'template.html'), 'utf8')
  const ctx: SignatureContext = {
    assetBase: ASSET_BASE,
    siteUrl: SITE_URL,
    bookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL ?? BOOKING_FALLBACK,
    tokens,
  }
  mkdirSync(OUT_HTML, { recursive: true })
  mkdirSync(OUT_ASSETS, { recursive: true })
  await renderNames(people, font, requireToken(tokens, 'amber'))
  await Promise.all(people.map((person) => renderPhoto(person)))
  await renderIcon(
    'linkedin',
    requireToken(tokens, 'linkedin'),
    requireToken(tokens, 'text'),
  )
  await renderIcon(
    'facebook',
    requireToken(tokens, 'facebook'),
    requireToken(tokens, 'text'),
  )
  await renderIcon('github', requireToken(tokens, 'github'), requireToken(tokens, 'text'))

  for (const person of people) {
    writeFileSync(
      join(OUT_HTML, `${person.slug}.html`),
      renderSignature(template, person, ctx),
    )
  }
  console.log(`wrote ${String(people.length)} signatures with font ${font}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
