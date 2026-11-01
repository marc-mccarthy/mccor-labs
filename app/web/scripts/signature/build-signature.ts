import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import {
  CARD_ICON,
  CARD_PHOTO,
  type Layout,
  type Person,
  type Renderer,
  type SignatureContext,
  parsePeople,
  readTokens,
  renderCardSignature,
  renderSignature,
  requireToken,
} from './signature'

const HERE = import.meta.dirname
const WEB = join(HERE, '..', '..')
const OUT_DIR = join(WEB, 'public', 'sig', 'framed')
const TEAM_DIR = join(WEB, 'public', 'media', 'team')
const SRC_DIR = join(HERE, 'framed-src')
const PHOTO_DIR = join(HERE, 'photos')
const ASSET_BASE = 'https://mccorlabs.com/sig/framed'
const SITE_URL = 'https://mccorlabs.com'
const COMPANY = 'McCor Labs'

interface Box {
  width: number
  height: number
  radius: number
}

interface Crop {
  centerX: number
  top: number
  height: number
}

const PHOTO_SCALE = 3
const ICON_SCALE = 2
const CARD_PHOTO_PX: Box = {
  width: CARD_PHOTO.width * PHOTO_SCALE,
  height: CARD_PHOTO.height * PHOTO_SCALE,
  radius: 6 * PHOTO_SCALE,
}
const CREST_ART = {
  width: CARD_PHOTO_PX.width - 16,
  height: CARD_PHOTO_PX.height - 10,
}
const CARD_ICONS = [
  ['mccor', 'stag.png'],
  ['linkedin', 'linkedin.png'],
  ['github', 'github.png'],
] as const

interface LayoutBuild {
  template: string
  render: Renderer
  photoSuffix: string
  photo: Box
}

const LAYOUT_BUILDS: Record<Layout, LayoutBuild> = {
  framed: {
    template: 'template.html',
    render: renderSignature,
    photoSuffix: '',
    photo: { width: 378, height: 525, radius: 36 },
  },
  card: {
    template: 'card-template.html',
    render: renderCardSignature,
    photoSuffix: '-card',
    photo: CARD_PHOTO_PX,
  },
}

function roundedMask({ width, height, radius }: Box): Buffer {
  return Buffer.from(
    `<svg width="${String(width)}" height="${String(height)}"><rect width="${String(width)}" height="${String(height)}" rx="${String(radius)}" fill="#fff"/></svg>`,
  )
}

async function renderPhoto(source: string, out: string, box: Box): Promise<void> {
  await sharp(source)
    .resize(box.width, box.height, { fit: 'cover', position: 'top' })
    .ensureAlpha()
    .composite([{ input: roundedMask(box), blend: 'dest-in' }])
    .png()
    .toFile(out)
}

function readCrop(path: string): Crop {
  const data = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
  const crop: Record<string, number> = {}
  for (const key of ['centerX', 'top', 'height'] as const) {
    const value = data[key]
    if (typeof value !== 'number' || value < 0)
      throw new Error(`${path} needs a non-negative number "${key}"`)
    crop[key] = value
  }
  return crop as unknown as Crop
}

async function renderCroppedPhoto(
  source: string,
  crop: Crop,
  out: string,
  box: Box,
): Promise<void> {
  const width = Math.round((crop.height * box.width) / box.height)
  await sharp(source)
    .extract({
      left: Math.round(crop.centerX - width / 2),
      top: crop.top,
      width,
      height: crop.height,
    })
    .resize(box.width, box.height)
    .ensureAlpha()
    .composite([{ input: roundedMask(box), blend: 'dest-in' }])
    .png()
    .toFile(out)
}

async function ensurePhoto(person: Person, build: LayoutBuild): Promise<boolean> {
  const photo = join(OUT_DIR, `${person.slug}${build.photoSuffix}.png`)
  const crop = join(PHOTO_DIR, `${person.photo ?? ''}.json`)
  if (person.photo && existsSync(crop)) {
    await renderCroppedPhoto(
      join(PHOTO_DIR, `${person.photo}.webp`),
      readCrop(crop),
      photo,
      build.photo,
    )
    return true
  }
  if (existsSync(photo)) return true
  const source = join(TEAM_DIR, `${person.photo ?? ''}.webp`)
  if (!person.photo || !existsSync(source)) return false
  await renderPhoto(source, photo, build.photo)
  return true
}

async function writeCardArt(base: string): Promise<void> {
  const art = await sharp(join(SRC_DIR, 'crest.png'))
    .trim()
    .resize(CREST_ART.width, CREST_ART.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer()
  const { width, height } = CARD_PHOTO_PX
  await sharp({ create: { width, height, channels: 4, background: base } })
    .composite([
      { input: art, gravity: 'center' },
      { input: roundedMask(CARD_PHOTO_PX), blend: 'dest-in' },
    ])
    .png()
    .toFile(join(OUT_DIR, 'card-crest.png'))
  for (const [key, file] of CARD_ICONS)
    await sharp(join(SRC_DIR, file))
      .resize(CARD_ICON.width * ICON_SCALE, CARD_ICON.height * ICON_SCALE)
      .png()
      .toFile(join(OUT_DIR, `card-icon-${key}.png`))
}

async function main(): Promise<void> {
  const tokens = readTokens(
    readFileSync(join(WEB, 'src', 'styles', 'globals.css'), 'utf8'),
  )
  const people = parsePeople(
    process.env.TEAM_MEMBERS ?? readFileSync(join(HERE, 'people.json'), 'utf8'),
  )
  const ctx: SignatureContext = {
    assetBase: ASSET_BASE,
    siteUrl: SITE_URL,
    company: COMPANY,
    tokens,
  }
  mkdirSync(OUT_DIR, { recursive: true })
  if (people.some((person) => person.layout === 'card'))
    await writeCardArt(requireToken(tokens, 'base'))
  for (const person of people) {
    const build = LAYOUT_BUILDS[person.layout ?? 'framed']
    const template = readFileSync(join(HERE, build.template), 'utf8')
    const hasPhoto = await ensurePhoto(person, build)
    writeFileSync(
      join(OUT_DIR, `${person.slug}.html`),
      build.render(template, person, ctx, hasPhoto),
    )
  }
  console.log(`wrote ${String(people.length)} signatures`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
