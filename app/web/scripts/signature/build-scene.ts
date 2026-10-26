import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readTokens, requireToken } from './signature'

const HERE = import.meta.dirname
const WEB = join(HERE, '..', '..')
const SOURCE = join(HERE, 'scene-source.mp4')
const OUT_DIR = join(WEB, 'public', 'sig')
const OUT = join(OUT_DIR, 'scene.gif')

export const SCENE_W = 240
export const SCENE_H = 103
const CROP = { w: 700, h: 300, x: 300, y: 170 }
const FADE_W = 70
const FPS = 10
const SWEEP_END_S = 2.4
const SWEEP_SLOWDOWN = 0.625
const LIT_DIM_LEFT = 0.72
const LIT_DIM_RIGHT = 0.8
const FADE_FRAMES = 4
const FRAME_DELAY_CS = 10
const COLORS = 160
const DENOISE = 'hqdn3d=5:4:40:30'
const MAX_BYTES = 600_000
const OPTIMIZE_FUZZ = '6%'
const BLACK_POINT = { r: 0.13, g: 0.16, b: 0.19 }

function filters(): string {
  const crop = `crop=${String(CROP.w)}:${String(CROP.h)}:${String(CROP.x)}:${String(CROP.y)}`
  const levels = `colorlevels=rimin=${String(BLACK_POINT.r)}:gimin=${String(BLACK_POINT.g)}:bimin=${String(BLACK_POINT.b)}`
  const sweep = `trim=end=${String(SWEEP_END_S)},setpts=${String(SWEEP_SLOWDOWN)}*(PTS-STARTPTS)`
  return `${sweep},fps=${String(FPS)},${crop},${DENOISE},scale=${String(SCENE_W)}:${String(SCENE_H)}:flags=lanczos,${levels}`
}

function renderMask(dir: string): string {
  const mask = join(dir, 'mask.png')
  const solid = String(SCENE_W - FADE_W)
  execFileSync('magick', [
    '(',
    '-size',
    `${solid}x${String(SCENE_H)}`,
    'xc:white',
    ')',
    '(',
    '-size',
    `${String(SCENE_H)}x${String(FADE_W)}`,
    'gradient:white-black',
    '-rotate',
    '-90',
    ')',
    '+append',
    mask,
  ])
  return mask
}

function fadeIntoCard(frame: string, mask: string, base: string): void {
  execFileSync('magick', [
    frame,
    mask,
    '-compose',
    'multiply',
    '-composite',
    '-fill',
    base,
    '-fuzz',
    '3%',
    '-opaque',
    'black',
    frame,
  ])
}

function renderSweep(dir: string, base: string): string[] {
  execFileSync('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-i',
    SOURCE,
    '-vf',
    filters(),
    join(dir, 'sweep-%03d.png'),
  ])
  const mask = renderMask(dir)
  const frames = readdirSync(dir)
    .filter((name) => name.startsWith('sweep-'))
    .sort()
    .map((name) => join(dir, name))
  for (const frame of frames) fadeIntoCard(frame, mask, base)
  return frames
}

function renderLit(dir: string, sweep: string[]): string {
  const lit = join(dir, 'lit.png')
  execFileSync('magick', [
    ...sweep,
    '-evaluate-sequence',
    'max',
    '-fx',
    `u*(${String(LIT_DIM_LEFT)}+${String(LIT_DIM_RIGHT - LIT_DIM_LEFT)}*i/w)`,
    lit,
  ])
  return lit
}

function renderFade(dir: string, from: string, to: string): string[] {
  const frames: string[] = []
  for (let i = 1; i <= FADE_FRAMES; i++) {
    const path = join(dir, `fade-${String(i)}.png`)
    const percent = Math.round((100 * i) / (FADE_FRAMES + 1))
    execFileSync('magick', [
      from,
      to,
      '-compose',
      'blend',
      '-define',
      `compose:args=${String(percent)}`,
      '-composite',
      path,
    ])
    frames.push(path)
  }
  return frames
}

function main(): void {
  const dir = mkdtempSync(join(tmpdir(), 'sig-scene-'))
  mkdirSync(OUT_DIR, { recursive: true })
  const tokens = readTokens(
    readFileSync(join(WEB, 'src', 'styles', 'globals.css'), 'utf8'),
  )
  const sweep = renderSweep(dir, requireToken(tokens, 'base'))
  const last = sweep.at(-1)
  if (!last) throw new Error('ffmpeg produced no sweep frames')
  const lit = renderLit(dir, sweep)
  const frames = [...sweep, ...renderFade(dir, last, lit), lit]
  execFileSync('magick', [
    '-delay',
    String(FRAME_DELAY_CS),
    ...frames,
    '-loop',
    '1',
    '-colors',
    String(COLORS),
    '-fuzz',
    OPTIMIZE_FUZZ,
    '-layers',
    'Optimize',
    OUT,
  ])
  rmSync(dir, { recursive: true, force: true })
  const bytes = statSync(OUT).size
  if (bytes > MAX_BYTES)
    throw new Error(`scene.gif is ${String(bytes)} bytes, over ${String(MAX_BYTES)}`)
  console.log(
    `wrote scene.gif ${String(bytes)} bytes, ${String(frames.length)} frames, plays once`,
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
