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
  frames: 46,
  frameCs: 7,
  restCs: 100,
  start: -48,
  head: 14,
  tail: 84,
  bloom: { gain: 0.6, sigma: 90, lag: 45 },
  reachBack: 340,
  reachFront: 220,
}
const LINE_LEVELS = '3%,30%'
const FRAME_COLORS = 128
const FRAME_FUZZ = '3%'
const FRAME_MAX_BYTES = 1_000_000

const CREST = {
  src: 'crest.png',
  out: 'crest.gif',
  w: 320,
  h: 356,
  slant: 0.4,
  holdCs: 160,
  frames: 30,
  frameCs: 7,
  restCs: 100,
  colors: 256,
  paletteStep: 3,
  floor: '20%,100%',
  margin: 90,
  core: { sigma: 9, gain: 0.85 },
  halo: { sigma: 30, gain: 0.38 },
  trail: { sigma: 4, gain: 0.45, offset: 38 },
  maxBytes: 400_000,
}

const ICON = {
  files: [
    { src: 'stag.png', out: 'icon-mccor.gif' },
    { src: 'linkedin.png', out: 'icon-linkedin.gif' },
    { src: 'github.png', out: 'icon-github.gif' },
  ],
  scale: 2,
  glyph: 24,
  canvasH: 56,
  holdCs: 60,
  frameCs: 4,
  restCs: 100,
  hops: [30, 15, 7],
  secondsPerRoot: 0.109,
  squash: [
    { x: 1.07, y: 0.88 },
    { x: 1.03, y: 0.95 },
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
  const { frames, start, tail } = SHINE
  const total = perimeterLength() + 4 * tail - start
  return Array.from({ length: frames }, (_, i) => start + (total * i) / (frames - 1))
}

export function crestSpan(): number {
  return CREST.w + CREST.slant * CREST.h
}

export function crestCenters(): number[] {
  const { frames, margin } = CREST
  const total = crestSpan() + 2 * margin
  return Array.from({ length: frames }, (_, i) => -margin + (total * (i + 0.5)) / frames)
}

export function hopFrames(height: number): number {
  const seconds = ICON.secondsPerRoot * Math.sqrt(height)
  return Math.round(seconds / (ICON.frameCs / 100))
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
): { min: number; max: number } {
  const header = Buffer.from(`P5\n${String(size.w)} ${String(size.h)}\n65535\n`)
  const body = Buffer.alloc(size.w * size.h * 2)
  const total = perimeterLength()
  let min = total
  let max = 0
  for (let j = 0; j < size.h; j++) {
    for (let i = 0; i < size.w; i++) {
      const x = slice.x + ((i + 0.5) * slice.w) / size.w
      const y = slice.y + ((j + 0.5) * slice.h) / size.h
      const position = perimeterPosition(x, y)
      min = Math.min(min, position)
      max = Math.max(max, position)
      body.writeUInt16BE(Math.round((position / total) * 65535), (j * size.w + i) * 2)
    }
  }
  writeFileSync(file, Buffer.concat([header, body]))
  return { min, max }
}

function writeCrestField(file: string): void {
  const { w, h, slant } = CREST
  const header = Buffer.from(`P5\n${String(w)} ${String(h)}\n65535\n`)
  const body = Buffer.alloc(w * h * 2)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const value = Math.round(((x + 0.5 + slant * (y + 0.5)) / crestSpan()) * 65535)
      body.writeUInt16BE(value, (y * w + x) * 2)
    }
  }
  writeFileSync(file, Buffer.concat([header, body]))
}

function crestBand(center: number): string {
  const { core, halo, trail } = CREST
  const u = `u*${String(crestSpan())}`
  const term = (gain: number, sigma: number, at: number): string =>
    `${String(gain)}*exp(-pow((${u}-(${String(at)}))/${String(sigma)},2))`
  return [
    term(core.gain, core.sigma, center),
    term(halo.gain, halo.sigma, center),
    term(trail.gain, trail.sigma, center - trail.offset),
  ].join('+')
}

function cometProfile(center: number): string {
  const { head, tail, bloom } = SHINE
  const d = `(${String(center)}-u*${String(perimeterLength())})`
  const streak = `(${d}>=0?exp(-${d}/${String(tail)}):exp(-pow(${d}/${String(head)},2)))`
  const glow = `${String(bloom.gain)}*exp(-pow((${d}-${String(bloom.lag)})/${String(bloom.sigma)},2))`
  return `min(1,${streak}+${glow})`
}

function shineFrame(
  dir: string,
  name: string,
  source: string,
  size: { w: number; h: number },
  color: string,
  center: number,
  out: string,
): void {
  const field = join(dir, `${name}-field.pgm`)
  const lum = join(dir, `${name}-lum.png`)
  const bellFile = join(dir, `${name}-bell.png`)
  const mask = join(dir, `${name}-mask.png`)
  run([field, '-fx', cometProfile(center), bellFile])
  run([bellFile, lum, '-compose', 'Multiply', '-composite', mask])
  run([
    source,
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
  dither = '+dither',
): void {
  const args: string[] = []
  frames.forEach((frame, i) => {
    args.push('-delay', String(delays[i]), frame)
  })
  run([
    ...args,
    '-colors',
    String(colors),
    ...dither.split(' '),
    '-fuzz',
    fuzz,
    '-layers',
    'OptimizeFrame',
    '-layers',
    'OptimizeTransparency',
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
    const range = writeField(join(dir, `${slice.name}-field.pgm`), slice, size)
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
      const lit =
        center - SHINE.reachBack <= range.max && center + SHINE.reachFront >= range.min
      if (!lit) {
        frames.push(source)
        return
      }
      const out = join(dir, `${slice.name}-${pad(i)}.png`)
      shineFrame(dir, slice.name, source, size, color, center, out)
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

function assembleCrest(
  dir: string,
  frames: string[],
  delays: number[],
  base: string,
  out: string,
): void {
  const palette = join(dir, 'crest-palette.png')
  const sampled = frames.filter((_, i) => i % CREST.paletteStep === 0)
  run([
    ...sampled,
    '-append',
    '-colors',
    String(CREST.colors - 1),
    '+dither',
    '-unique-colors',
    palette,
  ])
  run([palette, '-size', '1x1', `xc:${base}`, '+append', palette])
  const args: string[] = []
  frames.forEach((frame, i) => {
    args.push('-delay', String(delays[i]), frame)
  })
  run([
    ...args,
    '-remap',
    palette,
    '+dither',
    '-layers',
    'OptimizeFrame',
    '-layers',
    'OptimizeTransparency',
    out,
  ])
  playOnce(out)
}

function buildCrest(dir: string, light: string, base: string): number {
  const { w, h } = CREST
  const size = `${String(w)}x${String(h)}`
  const scaled = join(dir, 'crest-scaled.png')
  const flat = join(dir, 'crest-flat.png')
  const alpha = join(dir, 'crest-alpha.png')
  const field = join(dir, 'crest-field.pgm')
  run([join(SRC_DIR, CREST.src), '-filter', 'Lanczos', '-resize', `${size}!`, scaled])
  run(['-size', size, `xc:${base}`, scaled, '-composite', flat])
  run([scaled, '-alpha', 'extract', alpha])
  writeCrestField(field)
  const frames = [flat]
  crestCenters().forEach((center, i) => {
    const band = join(dir, `crest-band-${pad(i)}.png`)
    const out = join(dir, `crest-${pad(i)}.png`)
    run([field, '-fx', crestBand(center), '-level', CREST.floor, band])
    const mask = join(dir, `crest-mask-${pad(i)}.png`)
    run([band, alpha, '-compose', 'Multiply', '-composite', mask])
    run([
      flat,
      '(',
      '-size',
      size,
      `xc:${light}`,
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
    frames.push(out)
  })
  frames.push(flat)
  const delays = [CREST.holdCs, ...crestCenters().map(() => CREST.frameCs), CREST.restCs]
  const out = join(OUT_DIR, CREST.out)
  assembleCrest(dir, frames, delays, base, out)
  const bytes = statSync(out).size
  console.log(
    `wrote ${CREST.out} ${String(bytes)} bytes, ${String(frames.length)} frames`,
  )
  return bytes
}

interface IconPose {
  lift: number
  x: number
  y: number
}

export function iconPoses(): IconPose[] {
  const rest: IconPose = { lift: 0, x: 1, y: 1 }
  const poses: IconPose[] = [rest]
  for (const height of ICON.hops) {
    const frames = hopFrames(height)
    for (let f = 0; f < frames; f++)
      poses.push({ lift: hopOffset(height, f, frames), x: 1, y: 1 })
    for (const squash of ICON.squash) poses.push({ lift: 0, ...squash })
  }
  poses.push(rest)
  return poses
}

function buildIcons(dir: string, card: string): void {
  const glyph = ICON.glyph * ICON.scale
  const canvas = `${String(glyph)}x${String(ICON.canvasH * ICON.scale)}`
  const poses = iconPoses()
  for (const { src, out } of ICON.files) {
    const stem = src.replace('.png', '')
    const frames = poses.map((pose, i) => {
      const file = join(dir, `${stem}-${pad(i)}.png`)
      const w = Math.round(glyph * pose.x)
      const h = Math.round(glyph * pose.y)
      const left = Math.round((glyph - w) / 2)
      const top = ICON.canvasH * ICON.scale - h - pose.lift * ICON.scale
      run([
        '-size',
        canvas,
        `xc:${card}`,
        '(',
        join(SRC_DIR, src),
        '-filter',
        'Lanczos',
        '-resize',
        `${String(w)}x${String(h)}!`,
        ')',
        '-geometry',
        `+${String(left)}+${String(top)}`,
        '-composite',
        file,
      ])
      return file
    })
    const delays = poses.map(() => ICON.frameCs)
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
    const crest = buildCrest(dir, shine, requireToken(tokens, 'base'))
    if (crest > CREST.maxBytes)
      throw new Error(
        `${CREST.out} is ${String(crest)} bytes, over ${String(CREST.maxBytes)}`,
      )
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
