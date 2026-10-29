import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import {
  type Person,
  type SignatureContext,
  parsePeople,
  readTokens,
  renderSignature,
} from './signature'

const HERE = import.meta.dirname
const WEB = join(HERE, '..', '..')
const OUT_DIR = join(WEB, 'public', 'sig', 'framed')
const TEAM_DIR = join(WEB, 'public', 'media', 'team')
const ASSET_BASE = 'https://mccorlabs.com/sig/framed'
const SITE_URL = 'https://mccorlabs.com'
const COMPANY = 'McCor Labs'

const CARD = { width: 378, height: 525, radius: 36 }

function roundedMask(): Buffer {
  const { width, height, radius } = CARD
  return Buffer.from(
    `<svg width="${String(width)}" height="${String(height)}"><rect width="${String(width)}" height="${String(height)}" rx="${String(radius)}" fill="#fff"/></svg>`,
  )
}

async function renderCard(source: string, out: string): Promise<void> {
  await sharp(source)
    .resize(CARD.width, CARD.height, { fit: 'cover', position: 'top' })
    .ensureAlpha()
    .composite([{ input: roundedMask(), blend: 'dest-in' }])
    .png()
    .toFile(out)
}

async function ensureCard(person: Person): Promise<boolean> {
  const card = join(OUT_DIR, `${person.slug}.png`)
  if (existsSync(card)) return true
  const source = join(TEAM_DIR, `${person.photo ?? ''}.webp`)
  if (!person.photo || !existsSync(source)) return false
  await renderCard(source, card)
  return true
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
    company: COMPANY,
    tokens,
  }
  mkdirSync(OUT_DIR, { recursive: true })
  for (const person of people) {
    const hasCard = await ensureCard(person)
    writeFileSync(
      join(OUT_DIR, `${person.slug}.html`),
      renderSignature(template, person, ctx, hasCard),
    )
  }
  console.log(`wrote ${String(people.length)} signatures`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
