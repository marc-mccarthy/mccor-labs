import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readTokens, requireToken } from './signature'

const HERE = import.meta.dirname
const WEB = join(HERE, '..', '..')
const SRC_DIR = join(HERE, 'framed-src')
const OUT_DIR = join(WEB, 'public', 'sig', 'framed')
const GLOBALS = join(WEB, 'src', 'styles', 'globals.css')

const FRAME = { w: 600, h: 240, inset: 10 }
const SLICES = [
  { name: 'tl', x: 0, y: 0, w: 26, h: 26 },
  { name: 'top', x: 26, y: 0, w: 548, h: 26 },
  { name: 'tr', x: 574, y: 0, w: 26, h: 26 },
  { name: 'left', x: 0, y: 26, w: 26, h: 189 },
  { name: 'right', x: 574, y: 26, w: 26, h: 189 },
  { name: 'bl', x: 0, y: 215, w: 26, h: 25 },
  { name: 'bottom', x: 26, y: 215, w: 548, h: 25 },
  { name: 'br', x: 574, y: 215, w: 26, h: 25 },
] as const

const SHINE = {
  holdCs: 30,
  frames: 20,
  frameCs: 6,
  restCs: 100,
  spread: 140,
  strength: 0.9,
}
const LINE_LEVELS = '6%,50%'
const FRAME_COLORS = 96
const FRAME_FUZZ = '3%'
const FRAME_MAX_BYTES = 400_000

const ICON = {
  files: [
    { src: 'stag.png', out: 'icon-mccor.gif' },
    { src: 'linkedin.png', out: 'icon-linkedin.gif' },
    { src: 'github.png', out: 'icon-github.gif' },
  ],
  scale: 2,
  glyph: 24,
  canvasH: 32,
  holdCs: 60,
  frameCs: 4,
  restCs: 100,
  hops: [
    { height: 8, frames: 11 },
    { height: 4, frames: 8 },
    { height: 1, frames: 3 },
  ],
  colors: 128,
}

export function perimeterPosition(x: number, y: number): number {
  const { w, h, inset } = FRAME
  const left = inset
  const right = w - inset
  const top = inset
  const bottom = h - inset
  const width = right - left
  const height = bottom - top
  const clamp = (value: number, max: number): number => Math.min(Math.max(value, 0), max)
  const candidates = [
    { dist: Math.abs(y - top), s: clamp(x - left, width) },
    { dist: Math.abs(x - right), s: width + clamp(y - top, height) },
    { dist: Math.abs(y - bottom), s: width + height + clamp(right - x, width) },
    { dist: Math.abs(x - left), s: 2 * width + height + clamp(bottom - y, height) },
  ]
  const nearest = candidates.reduce((best, next) => (next.dist < best.dist ? next : best))
  return nearest.s
}

export function perimeterLength(): number {
  const { w, h, inset } = FRAME
  return 2 * (w - 2 * inset) + 2 * (h - 2 * inset)
}

export function shineCenters(): number[] {
  const { frames, spread } = SHINE
  const total = perimeterLength() + 2 * spread
  return Array.from({ length: frames }, (_, i) => -spread + (total * (i + 0.5)) / frames)
}

export function hopOffset(height: number, frame: number, frames: number): number {
  const u = (frame + 1) / (frames + 1)
  return Math.round(height * 4 * u * (1 - u))
}

function run(args: string[]): void {
  try {
    execFileSync('magick', args, { stdio: ['ignore', 'ignore', 'pipe'] })
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? String(error)
    throw new Error(`magick ${args.slice(0, 6).join(' ')} failed: ${stderr}`)
  }
}

function requireMagick(): void {
  try {
    execFileSync('magick', ['-version'], { stdio: 'ignore' })
  } catch {
    throw new Error('magick (ImageMagick 7) is not installed or not on PATH')
  }
}

function dimensions(file: string): { w: number; h: number } {
  const out = execFileSync('magick', ['identify', '-format', '%w %h', file], {
    encoding: 'utf8',
  })
  const [w, h] = out.split(' ').map(Number)
  if (!w || !h) throw new Error(`could not read size of ${file}`)
  return { w, h }
}

function pad(index: number): string {
  return String(index).padStart(3, '0')
}

function writeField(
  file: string,
  slice: (typeof SLICES)[number],
  size: { w: number; h: number },
): void {
  const header = Buffer.from(`P5\n${String(size.w)} ${String(size.h)}\n65535\n`)
  const body = Buffer.alloc(size.w * size.h * 2)
  const total = perimeterLength()
  for (let j = 0; j < size.h; j++) {
    for (let i = 0; i < size.w; i++) {
      const x = slice.x + ((i + 0.5) * slice.w) / size.w
      const y = slice.y + ((j + 0.5) * slice.h) / size.h
      const value = Math.round((perimeterPosition(x, y) / total) * 65535)
      body.writeUInt16BE(value, (j * size.w + i) * 2)
    }
  }
  writeFileSync(file, Buffer.concat([header, body]))
}

function shineFrame(
  dir: string,
  name: string,
  size: { w: number; h: number },
  color: string,
  center: number,
  out: string,
): void {
  const total = perimeterLength()
  const field = join(dir, `${name}-field.pgm`)
  const lum = join(dir, `${name}-lum.png`)
  const bellFile = join(dir, `${name}-bell.png`)
  const mask = join(dir, `${name}-mask.png`)
  const bell = `${String(SHINE.strength)}*exp(-pow((u*${String(total)}-(${String(center)}))/${String(SHINE.spread)},2))`
  run([field, '-fx', bell, bellFile])
  run([bellFile, lum, '-compose', 'Multiply', '-composite', mask])
  run([
    join(SRC_DIR, `frame-${name}.png`),
    '(',
    '-size',
    `${String(size.w)}x${String(size.h)}`,
    `xc:${color}`,
    mask,
    '-compose',
    'Multiply',
    '-composite',
    ')',
    '-compose',
    'Screen',
    '-composite',
    out,
  ])
}

const LOOP_BLOCK = Buffer.concat([
  Buffer.from([0x21, 0xff, 0x0b]),
  Buffer.from('NETSCAPE2.0', 'ascii'),
  Buffer.from([0x03, 0x01]),
])
const LOOP_BLOCK_LENGTH = LOOP_BLOCK.length + 3

export function stripLoop(gif: Buffer): Buffer {
  const at = gif.indexOf(LOOP_BLOCK)
  if (at < 0) return gif
  return Buffer.concat([gif.subarray(0, at), gif.subarray(at + LOOP_BLOCK_LENGTH)])
}

function playOnce(file: string): void {
  const stripped = stripLoop(readFileSync(file))
  if (stripped.includes('NETSCAPE2.0')) throw new Error(`${file} still has a loop block`)
  writeFileSync(file, stripped)
}

function assemble(
  frames: string[],
  delays: number[],
  colors: number,
  fuzz: string,
  out: string,
): void {
  const args: string[] = []
  frames.forEach((frame, i) => {
    args.push('-delay', String(delays[i]), frame)
  })
  run([
    ...args,
    '-colors',
    String(colors),
    '+dither',
    '-fuzz',
    fuzz,
    '-layers',
    'Optimize',
    out,
  ])
  playOnce(out)
}

function buildFrames(dir: string, color: string): number {
  const centers = shineCenters()
  let bytes = 0
  for (const slice of SLICES) {
    const source = join(SRC_DIR, `frame-${slice.name}.png`)
    const size = dimensions(source)
    const field = join(dir, `${slice.name}-field.pgm`)
    writeField(field, slice, size)
    run([
      source,
      '-colorspace',
      'Gray',
      '-level',
      LINE_LEVELS,
      join(dir, `${slice.name}-lum.png`),
    ])
    const frames = [source]
    centers.forEach((center, i) => {
      const out = join(dir, `${slice.name}-${pad(i)}.png`)
      shineFrame(dir, slice.name, size, color, center, out)
      frames.push(out)
    })
    frames.push(source)
    const delays = [SHINE.holdCs, ...centers.map(() => SHINE.frameCs), SHINE.restCs]
    const out = join(OUT_DIR, `frame-${slice.name}.gif`)
    assemble(frames, delays, FRAME_COLORS, FRAME_FUZZ, out)
    bytes += statSync(out).size
    console.log(`wrote frame-${slice.name}.gif ${String(statSync(out).size)} bytes`)
  }
  return bytes
}

function iconOffsets(): number[] {
  const offsets = [0]
  for (const hop of ICON.hops) {
    for (let f = 0; f < hop.frames; f++)
      offsets.push(hopOffset(hop.height, f, hop.frames))
    offsets.push(0)
  }
  return offsets
}

function buildIcons(dir: string, card: string): void {
  const glyph = ICON.glyph * ICON.scale
  const canvas = `${String(glyph)}x${String(ICON.canvasH * ICON.scale)}`
  const room = (ICON.canvasH - ICON.glyph) * ICON.scale
  const offsets = iconOffsets()
  for (const { src, out } of ICON.files) {
    const stem = src.replace('.png', '')
    const frames = offsets.map((offset, i) => {
      const file = join(dir, `${stem}-${pad(i)}.png`)
      run([
        '-size',
        canvas,
        `xc:${card}`,
        '(',
        join(SRC_DIR, src),
        '-filter',
        'Lanczos',
        '-resize',
        `${String(glyph)}x${String(glyph)}`,
        ')',
        '-geometry',
        `+0+${String(room - offset * ICON.scale)}`,
        '-composite',
        file,
      ])
      return file
    })
    const delays = offsets.map(() => ICON.frameCs)
    delays[0] = ICON.holdCs
    delays[delays.length - 1] = ICON.restCs
    assemble(frames, delays, ICON.colors, '0%', join(OUT_DIR, out))
    console.log(
      `wrote ${out} ${String(statSync(join(OUT_DIR, out)).size)} bytes, ${String(frames.length)} frames`,
    )
  }
}

function main(): void {
  requireMagick()
  const tokens = readTokens(readFileSync(GLOBALS, 'utf8'))
  const shine = requireToken(tokens, 'text')
  const card = requireToken(tokens, 'text')
  const dir = mkdtempSync(join(tmpdir(), 'sig-motion-'))
  mkdirSync(OUT_DIR, { recursive: true })
  try {
    const bytes = buildFrames(dir, shine)
    buildIcons(dir, card)
    console.log(`frame gifs total ${String(bytes)} bytes`)
    if (bytes > FRAME_MAX_BYTES)
      throw new Error(
        `frame gifs are ${String(bytes)} bytes, over ${String(FRAME_MAX_BYTES)}`,
      )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
