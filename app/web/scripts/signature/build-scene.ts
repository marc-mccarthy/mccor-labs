import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { readTokens, requireToken } from './signature'

const HERE = import.meta.dirname
const WEB = join(HERE, '..', '..')
const STAG = join(WEB, 'public', 'media', 'brand', 'mccor-stag-stride.webp')
const OUT = join(WEB, 'public', 'sig', 'scene.gif')

const W = 880
const H = 640
const OUT_W = 440
const OUT_H = 320
const FRAMES_N = 34
const FRAME_DELAY_CS = 29
const COLORS = 64
const MAX_BYTES = 500_000

const STAG_H = 560
const STAG_Y = 60
const ANTLER_FRACTION = 0.36
const GLOW_BLUR = 30
const GLOW_MIN = 0.6
const GLOW_MAX = 1
const SHIMMER_W = 300
const SHIMMER_SKEW = 120
const SHIMMER_GAIN = 3
const SHIMMER_LIFT = 0
const SHIMMER_BLOOM = 10

const PINES: readonly { x: number; h: number; faint?: boolean }[] = [
  { x: 120, h: 400 },
  { x: 270, h: 300 },
  { x: 620, h: 320 },
  { x: 770, h: 420 },
  { x: 440, h: 200, faint: true },
]
const TIERS = 3
const GRASS_TUFTS = 16

function pine(x: number, h: number, faint: boolean, pine: string): string {
  const base = H - 90
  const top = base - h
  const w = h * 0.6
  const parts: string[] = []
  for (let i = 0; i < TIERS; i++) {
    const tierTop = top + (h * 0.75 * i) / TIERS
    const tierBottom = top + (h * 0.75 * (i + 1.35)) / TIERS
    const half = (w * (i + 1.6)) / (TIERS + 0.6) / 2
    parts.push(
      String.raw`<polygon points="${x},${tierTop} ${x + half},${tierBottom} ${x - half},${tierBottom}"/>`,
    )
    parts.push(
      String.raw`<polyline points="${x - half * 0.55},${tierBottom} ${x},${tierTop + (tierBottom - tierTop) * 0.45} ${x + half * 0.55},${tierBottom}"/>`,
    )
  }
  parts.push(String.raw`<line x1="${x}" y1="${base - h * 0.08}" x2="${x}" y2="${base}"/>`)
  return String.raw`<g stroke="${pine}" stroke-width="${faint ? 1.5 : 2.5}" stroke-opacity="${faint ? 0.3 : 0.95}" fill="none" stroke-linejoin="round" filter="url(#glow)">${parts.join('')}</g>`
}

function grass(grassColor: string): string {
  const blades: string[] = []
  for (let i = 0; i < GRASS_TUFTS; i++) {
    const x = 30 + (i * (W - 60)) / (GRASS_TUFTS - 1)
    const h = 34 + ((i * 29) % 26)
    blades.push(
      String.raw`<polyline points="${x - 14},${H - 22} ${x - 6},${H - 22 - h * 0.7} ${x - 3},${H - 22} ${x + 2},${H - 22 - h} ${x + 6},${H - 22} ${x + 10},${H - 22 - h * 0.6} ${x + 16},${H - 22}"/>`,
    )
  }
  return String.raw`<g stroke="${grassColor}" stroke-width="2.5" fill="none" stroke-linejoin="round">${blades.join('')}</g>`
}

function backgroundSvg(base: string, pineColor: string, grassColor: string): Buffer {
  const pines = PINES.map(({ x, h, faint }) =>
    pine(x, h, faint ?? false, pineColor),
  ).join('')
  return Buffer.from(
    String.raw`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><radialGradient id="haze" cx="0.5" cy="0.85" r="0.6"><stop offset="0" stop-color="${grassColor}" stop-opacity="0.45"/><stop offset="1" stop-color="${grassColor}" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="${base}"/><rect width="${W}" height="${H}" fill="url(#haze)"/>${pines}${grass(grassColor)}</svg>`,
  )
}

async function stagLayer(): Promise<{ stag: Buffer; width: number }> {
  const stag = await sharp(STAG).resize({ height: STAG_H }).png().toBuffer()
  const { width } = await sharp(stag).metadata()
  if (!width) throw new Error('stag has no width')
  return { stag, width }
}

async function glowLayer(stag: Buffer, width: number, amber: string): Promise<Buffer> {
  const antlerH = Math.round(STAG_H * ANTLER_FRACTION)
  const alpha = await sharp(stag)
    .extract({ left: 0, top: 0, width, height: antlerH })
    .extractChannel('alpha')
    .toBuffer()
  const tint = await sharp({
    create: { width, height: antlerH, channels: 3, background: amber },
  })
    .png()
    .toBuffer()
  return sharp(tint)
    .joinChannel(alpha)
    .blur(GLOW_BLUR)
    .extend({
      top: GLOW_BLUR * 2,
      bottom: GLOW_BLUR * 2,
      left: GLOW_BLUR * 2,
      right: GLOW_BLUR * 2,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()
}

function shimmerMask(x: number): Buffer {
  return Buffer.from(
    String.raw`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><polygon points="${x},0 ${x + SHIMMER_W},0 ${x + SHIMMER_W - SHIMMER_SKEW},${H} ${x - SHIMMER_SKEW},${H}" fill="url(#g)"/></svg>`,
  )
}

async function composeScene(
  bg: Buffer,
  stag: Buffer,
  stagW: number,
  glow: Buffer,
  glowAlpha: number,
): Promise<Buffer> {
  const stagX = Math.round((W - stagW) / 2)
  const glowFaded = await sharp(glow)
    .ensureAlpha()
    .linear([1, 1, 1, glowAlpha], [0, 0, 0, 0])
    .png()
    .toBuffer()
  return sharp(bg)
    .composite([
      {
        input: glowFaded,
        left: stagX - GLOW_BLUR * 2,
        top: STAG_Y - GLOW_BLUR * 2,
        blend: 'screen',
      },
      { input: stag, left: stagX, top: STAG_Y },
    ])
    .png()
    .toBuffer()
}

async function renderFrame(
  i: number,
  dir: string,
  bg: Buffer,
  stag: Buffer,
  stagW: number,
  glow: Buffer,
): Promise<string> {
  const t = i / FRAMES_N
  const glowAlpha =
    GLOW_MIN + (GLOW_MAX - GLOW_MIN) * (0.5 - 0.5 * Math.cos(2 * Math.PI * t))
  const shimmerX = Math.round(-SHIMMER_W + t * (W + SHIMMER_W * 2))
  const scene = await composeScene(bg, stag, stagW, glow, glowAlpha)
  const bright = await sharp(scene).linear(SHIMMER_GAIN, SHIMMER_LIFT).png().toBuffer()
  const bloom = await sharp(bright).blur(SHIMMER_BLOOM).png().toBuffer()
  const lit = await sharp(bright)
    .composite([{ input: bloom, blend: 'screen' }])
    .ensureAlpha()
    .composite([{ input: shimmerMask(shimmerX), blend: 'dest-in' }])
    .png()
    .toBuffer()
  const path = join(dir, `frame-${String(i).padStart(2, '0')}.png`)
  const composed = await sharp(scene)
    .composite([{ input: lit }])
    .png()
    .toBuffer()
  await sharp(composed).resize(OUT_W, OUT_H).png().toFile(path)
  return path
}

async function main(): Promise<void> {
  const tokens = readTokens(
    readFileSync(join(WEB, 'src', 'styles', 'globals.css'), 'utf8'),
  )
  const bg = await sharp(
    backgroundSvg(
      requireToken(tokens, 'base'),
      requireToken(tokens, 'pine'),
      requireToken(tokens, 'grass'),
    ),
  )
    .png()
    .toBuffer()
  const { stag, width } = await stagLayer()
  const glow = await glowLayer(stag, width, requireToken(tokens, 'amber'))
  const dir = mkdtempSync(join(tmpdir(), 'sig-frames-'))
  const frames: string[] = []
  for (let i = 0; i < FRAMES_N; i++) {
    frames.push(await renderFrame(i, dir, bg, stag, width, glow))
  }
  mkdirSync(join(WEB, 'public', 'sig'), { recursive: true })
  execFileSync('magick', [
    '-delay',
    String(FRAME_DELAY_CS),
    '-loop',
    '0',
    ...frames,
    '-colors',
    String(COLORS),
    '-fuzz',
    '4%',
    '-layers',
    'Optimize',
    OUT,
  ])
  rmSync(dir, { recursive: true, force: true })
  const bytes = statSync(OUT).size
  if (bytes > MAX_BYTES)
    throw new Error(`scene.gif is ${String(bytes)} bytes, over ${String(MAX_BYTES)}`)
  console.log(`wrote scene.gif ${String(bytes)} bytes, ${String(FRAMES_N)} frames`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
