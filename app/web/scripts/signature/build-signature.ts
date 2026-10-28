import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import {
  type Person,
  type SignatureContext,
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
const CONTACT_URL = 'https://mccorlabs.com/contact'
const COMPANY = 'McCor Labs'

const PHOTO = 56
const RING = 2
const BACKDROP = { tolerance: 7, sample: 6 }
const ICON = 20
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

function circleMask(size: number): Buffer {
  const r = size / 2
  return Buffer.from(
    String.raw`<svg width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`,
  )
}

function ring(size: number, width: number, color: string): Buffer {
  const r = size / 2 - width / 2
  return Buffer.from(
    String.raw`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${width}"/></svg>`,
  )
}

function cornerGrey(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
): number {
  const greys: number[] = []
  const n = BACKDROP.sample
  for (const [x0, y0] of [
    [0, 0],
    [width - n, 0],
    [0, height - n],
    [width - n, height - n],
  ]) {
    for (let y = y0 ?? 0; y < (y0 ?? 0) + n; y++)
      for (let x = x0 ?? 0; x < (x0 ?? 0) + n; x++)
        greys.push(data[(y * width + x) * channels] ?? 0)
  }
  greys.sort((a, b) => a - b)
  return greys[Math.floor(greys.length / 2)] ?? 0
}

function backdropMask(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
): Buffer {
  const grey = cornerGrey(data, width, height, channels)
  const isBackdrop = (i: number) =>
    Math.abs((data[i * channels] ?? 0) - grey) <= BACKDROP.tolerance
  const alpha = Buffer.alloc(width * height, 255)
  const queue: number[] = []
  const visit = (i: number) => {
    if (alpha[i] === 0 || !isBackdrop(i)) return
    alpha[i] = 0
    queue.push(i)
  }
  for (let x = 0; x < width; x++) {
    visit(x)
    visit((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    visit(y * width)
    visit(y * width + width - 1)
  }
  while (queue.length > 0) {
    const i = queue.pop() ?? 0
    const x = i % width
    if (x > 0) visit(i - 1)
    if (x < width - 1) visit(i + 1)
    if (i >= width) visit(i - width)
    if (i + width < width * height) visit(i + width)
  }
  return alpha
}

async function cutOut(input: string, size: number, backdrop: string): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .resize(size, size, { fit: 'cover' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const pixels = info.width * info.height
  const alpha = backdropMask(data, info.width, info.height, info.channels)
  const rgba = Buffer.alloc(pixels * 4)
  for (let i = 0; i < pixels; i++) {
    const grey = data[i * info.channels] ?? 0
    rgba[i * 4] = grey
    rgba[i * 4 + 1] = grey
    rgba[i * 4 + 2] = grey
    rgba[i * 4 + 3] = alpha[i] ?? 0
  }
  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .flatten({ background: backdrop })
    .png()
    .toBuffer()
}

async function renderPhoto(
  person: Person,
  backdrop: string,
  ringColor: string,
): Promise<void> {
  const size = PHOTO * SCALE
  const subject = await cutOut(join(TEAM_DIR, `${person.photo}.webp`), size, backdrop)
  await sharp(subject)
    .composite([
      { input: circleMask(size), blend: 'dest-in' },
      { input: ring(size, RING * SCALE, ringColor), blend: 'over' },
    ])
    .png()
    .toFile(join(OUT_ASSETS, `photo-${person.slug}.png`))
}

async function renderIcon(
  name: keyof typeof ICON_PATHS,
  color: string,
  glyph: string,
  ringColor: string,
): Promise<void> {
  const svg = String.raw`<svg xmlns="http://www.w3.org/2000/svg" width="${ICON * SCALE}" height="${ICON * SCALE}" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="${color}"${ringColor ? ` stroke="${ringColor}" stroke-width="1"` : ''}/><path d="${ICON_PATHS[name]}" fill="${glyph}"${ICON_INSET[name] ? ` transform="${ICON_INSET[name]}"` : ''}/></svg>`
  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(OUT_ASSETS, `${name}.png`))
}

async function main(): Promise<void> {
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
    contactUrl: CONTACT_URL,
    company: COMPANY,
    tokens,
  }
  mkdirSync(OUT_HTML, { recursive: true })
  mkdirSync(OUT_ASSETS, { recursive: true })
  await Promise.all(
    people.map((person) =>
      renderPhoto(
        person,
        requireToken(tokens, 'elevated'),
        requireToken(tokens, 'crimson'),
      ),
    ),
  )
  for (const name of ['linkedin', 'facebook', 'github'] as const) {
    await renderIcon(
      name,
      requireToken(tokens, name),
      requireToken(tokens, 'text'),
      requireToken(tokens, 'border-strong'),
    )
  }

  for (const person of people) {
    writeFileSync(
      join(OUT_HTML, `${person.slug}.html`),
      renderSignature(template, person, ctx),
    )
  }
  console.log(`wrote ${String(people.length)} signatures`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
