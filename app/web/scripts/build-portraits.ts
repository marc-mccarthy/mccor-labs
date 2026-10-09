import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const CUTOUT_DIR = '/Users/mj/Downloads/mccor-team-cutouts'
const OUT_DIR = join(import.meta.dirname, '..', 'public', 'media', 'team')
const GLOBALS_CSS = join(import.meta.dirname, '..', 'src', 'styles', 'globals.css')

const WIDTH = 320
const HEIGHT = 400
const EYE_LINE = 180
const CHIN_LINE = 342
const GRAIN_SIGMA = 13
const GRAIN_SEED = 20261009
const EDGE_BLUR = 0.012
const EDGE_GAIN = 2.2
const HEAD_BAND = 0.7

const SLUGS = ['marcm', 'nateb', 'ashleyt', 'mariem'] as const

const PLACEMENT: Record<(typeof SLUGS)[number], { zoom: number; lower: number }> = {
  marcm: { zoom: 1.02, lower: 0 },
  nateb: { zoom: 0.95, lower: 0 },
  ashleyt: { zoom: 0.85, lower: 20 },
  mariem: { zoom: 0.8, lower: 0 },
}

interface FaceInfo {
  imageWidth: number
  imageHeight: number
  faceX: number
  faceY: number
  faceWidth: number
  faceHeight: number
  eyeY: number
  chinY: number
}

interface Rgb {
  r: number
  g: number
  b: number
}

function readColorToken(name: string): string {
  const css = readFileSync(GLOBALS_CSS, 'utf8')
  const hex = new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})\\b`, 'i').exec(css)?.[1]
  if (!hex) {
    throw new Error(`Color token --color-${name} not found in ${GLOBALS_CSS}`)
  }
  return hex
}

function toRgb(hex: string): Rgb {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  }
}

async function backdrop(color: Rgb): Promise<Buffer> {
  return sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 3, background: color },
  })
    .png()
    .toBuffer()
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

async function grain(): Promise<Buffer> {
  const random = seededRandom(GRAIN_SEED)
  const pixels = Buffer.alloc(WIDTH * HEIGHT)
  for (let i = 0; i < pixels.length; i++) {
    const gaussian =
      Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())
    pixels[i] = Math.min(255, Math.max(0, Math.round(128 + gaussian * GRAIN_SIGMA)))
  }
  return sharp(pixels, { raw: { width: WIDTH, height: HEIGHT, channels: 1 } })
    .png()
    .toBuffer()
}

async function chokeEdges(path: string, faceHeight: number): Promise<Buffer> {
  const alpha = await sharp(path)
    .extractChannel(3)
    .raw()
    .toBuffer({ resolveWithObject: true })
  const raw = {
    raw: { width: alpha.info.width, height: alpha.info.height, channels: 1 as const },
  }
  const blurred = await sharp(alpha.data, raw)
    .blur(Math.max(0.3, faceHeight * EDGE_BLUR))
    .toColourspace('b-w')
    .raw()
    .toBuffer()
  const choked = await sharp(blurred, raw)
    .linear(EDGE_GAIN, -(EDGE_GAIN - 1) * 255)
    .toColourspace('b-w')
    .raw()
    .toBuffer()
  const rgb = await sharp(path).removeAlpha().png().toBuffer()
  return sharp(rgb).joinChannel(choked, raw).png().toBuffer()
}

async function headCenterX(cutout: string, face: FaceInfo): Promise<number> {
  const { data, info } = await sharp(cutout)
    .extractChannel(3)
    .raw()
    .toBuffer({ resolveWithObject: true })
  const firstRow = Math.max(0, Math.round(face.faceY))
  const lastRow = Math.min(
    info.height,
    Math.round(face.faceY + face.faceHeight * HEAD_BAND),
  )
  const midpoints: number[] = []
  for (let y = firstRow; y < lastRow; y++) {
    const row = data.subarray(y * info.width, (y + 1) * info.width)
    const leftEdge = row.findIndex((value) => value > 128)
    if (leftEdge < 0) continue
    let rightEdge = row.length - 1
    while ((row[rightEdge] ?? 0) <= 128) rightEdge--
    midpoints.push((leftEdge + rightEdge) / 2)
  }
  if (midpoints.length === 0) {
    throw new Error(`${cutout}: no subject pixels across the face band`)
  }
  return midpoints.reduce((sum, value) => sum + value, 0) / midpoints.length
}

async function placeSubject(
  slug: (typeof SLUGS)[number],
): Promise<{ input: Buffer; left: number; top: number }> {
  const face = JSON.parse(
    readFileSync(join(CUTOUT_DIR, `${slug}.json`), 'utf8'),
  ) as FaceInfo
  const scale = (PLACEMENT[slug].zoom * (CHIN_LINE - EYE_LINE)) / (face.chinY - face.eyeY)
  const width = Math.round(face.imageWidth * scale)
  const height = Math.round(face.imageHeight * scale)
  const top = Math.round(EYE_LINE + PLACEMENT[slug].lower - face.eyeY * scale)
  if (top + height < HEIGHT) {
    throw new Error(
      `${slug}: subject ends ${String(HEIGHT - top - height)}px above the frame bottom`,
    )
  }
  const cutout = join(CUTOUT_DIR, `${slug}.png`)
  const meta = await sharp(cutout).metadata()
  if (meta.width !== face.imageWidth || meta.height !== face.imageHeight) {
    throw new Error(`${slug}: cutout size does not match its face JSON`)
  }
  const left = Math.round(WIDTH / 2 - (await headCenterX(cutout, face)) * scale)
  const subject = await sharp(await chokeEdges(cutout, face.faceHeight))
    .resize(width, height)
    .png()
    .toBuffer()
  const region = {
    left: Math.max(0, -left),
    top: Math.max(0, -top),
    width: Math.min(width - Math.max(0, -left), WIDTH - Math.max(0, left)),
    height: Math.min(height - Math.max(0, -top), HEIGHT - Math.max(0, top)),
  }
  if (region.width <= 0 || region.height <= 0) {
    throw new Error(`${slug}: subject falls outside the frame`)
  }
  return {
    input: await sharp(subject).extract(region).png().toBuffer(),
    left: Math.max(0, left),
    top: Math.max(0, top),
  }
}

async function buildPortrait(
  slug: (typeof SLUGS)[number],
  scene: Buffer,
  tint: Rgb,
): Promise<void> {
  const flat = await sharp(scene)
    .composite([await placeSubject(slug)])
    .png()
    .toBuffer()
  const toned = await sharp(flat).greyscale().tint(tint).png().toBuffer()
  const pipeline = sharp(toned).composite([{ input: await grain(), blend: 'soft-light' }])

  await pipeline
    .clone()
    .avif({ quality: 55 })
    .toFile(join(OUT_DIR, `${slug}.avif`))
  await pipeline
    .clone()
    .webp({ quality: 72 })
    .toFile(join(OUT_DIR, `${slug}.webp`))
}

function assertCutoutsExist(): void {
  const missing = SLUGS.flatMap((slug) => [`${slug}.png`, `${slug}.json`])
    .map((file) => join(CUTOUT_DIR, file))
    .filter((path) => !existsSync(path))
  if (missing.length > 0) {
    throw new Error(
      `Missing cutout(s); run scripts/cut-portrait.swift first:\n${missing.join('\n')}`,
    )
  }
}

async function main(): Promise<void> {
  assertCutoutsExist()
  const muted = toRgb(readColorToken('muted'))
  const scene = await backdrop(muted)
  mkdirSync(OUT_DIR, { recursive: true })
  for (const slug of SLUGS) {
    await buildPortrait(slug, scene, muted)
  }
}

await main()
