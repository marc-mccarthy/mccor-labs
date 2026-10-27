import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = import.meta.dirname
const WEB = join(HERE, '..', '..')
const SOURCE = join(HERE, 'scene-source.mp4')
const OUT_DIR = join(WEB, 'public', 'sig')
const OUT = join(OUT_DIR, 'scene.gif')

export const SCENE_W = 260
export const SCENE_H = 147
const CROP = { w: 700, h: 395, x: 300, y: 75 }
const ALPHA_THRESHOLD = '26%'
const FPS = 10
const SWEEP_END_S = 2.4
const SWEEP_SLOWDOWN = 0.625
const FADE_FRAMES = 4
const FRAME_DELAY_CS = 10
const COLORS = 160
const DENOISE = 'hqdn3d=5:4:40:30'
const MAX_BYTES = 600_000
const BLACK_POINT = { r: 0.13, g: 0.16, b: 0.19 }

function filters(): string {
  const crop = `crop=${String(CROP.w)}:${String(CROP.h)}:${String(CROP.x)}:${String(CROP.y)}`
  const levels = `colorlevels=rimin=${String(BLACK_POINT.r)}:gimin=${String(BLACK_POINT.g)}:bimin=${String(BLACK_POINT.b)}`
  const sweep = `trim=end=${String(SWEEP_END_S)},setpts=${String(SWEEP_SLOWDOWN)}*(PTS-STARTPTS)`
  return `${sweep},fps=${String(FPS)},${crop},${DENOISE},scale=${String(SCENE_W)}:${String(SCENE_H)}:flags=lanczos,${levels}`
}

function keyOutBlack(frame: string): void {
  const alpha = `${frame}.alpha.png`
  execFileSync('magick', [frame, '-separate', '-evaluate-sequence', 'max', alpha])
  execFileSync('magick', [
    frame,
    alpha,
    '-alpha',
    'off',
    '-compose',
    'CopyOpacity',
    '-composite',
    '-channel',
    'A',
    '-threshold',
    ALPHA_THRESHOLD,
    '+channel',
    '-background',
    'none',
    frame,
  ])
}

function renderSweep(dir: string): string[] {
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
  return readdirSync(dir)
    .filter((name) => name.startsWith('sweep-'))
    .sort()
    .map((name) => join(dir, name))
}

function renderLit(dir: string, sweep: string[]): string {
  const lit = join(dir, 'lit.png')
  execFileSync('magick', [...sweep, '-evaluate-sequence', 'max', lit])
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
  const sweep = renderSweep(dir)
  const last = sweep.at(-1)
  if (!last) throw new Error('ffmpeg produced no sweep frames')
  const lit = renderLit(dir, sweep)
  const frames = [...sweep, ...renderFade(dir, last, lit), lit]
  for (const frame of frames) keyOutBlack(frame)
  execFileSync('magick', [
    '-dispose',
    'Background',
    '-delay',
    String(FRAME_DELAY_CS),
    ...frames,
    '-loop',
    '1',
    '-colors',
    String(COLORS),
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
