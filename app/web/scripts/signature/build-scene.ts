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
const OUT_WEBM = join(OUT_DIR, 'scene.webm')
const OUT_MP4 = join(OUT_DIR, 'scene.mp4')

export const SCENE_W = 384
export const SCENE_H = 272
const CROP = { w: 560, h: 397, x: 450, y: 135 }
const FPS = 10
const SWEEP_END_S = 2.4
const SWEEP_SLOWDOWN = 0.625
const FADE_FRAMES = 4
const FRAME_DELAY_CS = 10
const HOLD_DELAY_CS = 60
const PLATE = '#08080a'
const PINE_HUE = { min: 0.19, max: 0.47 }
const PINE_DIM = '55,75,100'
const FEATHER = 44
const COLORS = 128
const DENOISE = 'hqdn3d=5:4:40:30'
const MAX_BYTES = 600_000
const BLACK_POINT = { r: 0.13, g: 0.16, b: 0.19 }

function filters(): string {
  const crop = `crop=${String(CROP.w)}:${String(CROP.h)}:${String(CROP.x)}:${String(CROP.y)}`
  const levels = `colorlevels=rimin=${String(BLACK_POINT.r)}:gimin=${String(BLACK_POINT.g)}:bimin=${String(BLACK_POINT.b)}`
  const sweep = `trim=end=${String(SWEEP_END_S)},setpts=${String(SWEEP_SLOWDOWN)}*(PTS-STARTPTS)`
  return `${sweep},fps=${String(FPS)},${crop},${DENOISE},scale=${String(SCENE_W)}:${String(SCENE_H)}:flags=lanczos,${levels}`
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

export const VIDEO_ENCODERS = ['libvpx-vp9', 'hevc_videotoolbox'] as const

export function missingEncoders(encoderList: string): string[] {
  return VIDEO_ENCODERS.filter((name) => !new RegExp(`\\s${name}\\s`).test(encoderList))
}

function requireEncoders(): void {
  const list = execFileSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' })
  const missing = missingEncoders(list)
  if (missing.length > 0) {
    throw new Error(
      `ffmpeg lacks ${missing.join(', ')}; hevc_videotoolbox needs macOS, so run this script there`,
    )
  }
}

export function videoArgs(input: string, target: 'webm' | 'mp4'): string[] {
  const base = ['-v', 'error', '-y', '-framerate', String(FPS), '-i', input]
  const evenSize = ['-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2:0:0:color=0x00000000']
  if (target === 'webm') {
    return [
      ...base,
      ...evenSize,
      '-c:v',
      'libvpx-vp9',
      '-pix_fmt',
      'yuva420p',
      '-b:v',
      '0',
      '-crf',
      '30',
      '-row-mt',
      '1',
      OUT_WEBM,
    ]
  }
  return [
    ...base,
    ...evenSize,
    '-c:v',
    'hevc_videotoolbox',
    '-pix_fmt',
    'bgra',
    '-alpha_quality',
    '0.9',
    '-q:v',
    '70',
    '-tag:v',
    'hvc1',
    '-movflags',
    '+faststart',
    OUT_MP4,
  ]
}

function renderVideo(dir: string, frames: string[]): void {
  frames.forEach((frame, i) => {
    execFileSync('magick', [frame, join(dir, `video-${String(i).padStart(3, '0')}.png`)])
  })
  const input = join(dir, 'video-%03d.png')
  execFileSync('ffmpeg', videoArgs(input, 'webm'))
  execFileSync('ffmpeg', videoArgs(input, 'mp4'))
}

function dimPines(frame: string): void {
  const mask = `${frame}.pines.png`
  execFileSync('magick', [
    frame,
    '-colorspace',
    'HSB',
    '-channel',
    'R',
    '-separate',
    '+channel',
    '-fx',
    `(u>=${String(PINE_HUE.min)}&&u<=${String(PINE_HUE.max)})?1:0`,
    mask,
  ])
  execFileSync('magick', [
    frame,
    '(',
    '+clone',
    '-modulate',
    PINE_DIM,
    ')',
    mask,
    '-composite',
    frame,
  ])
}

function plate(frame: string): void {
  execFileSync('magick', [
    '-size',
    `${String(SCENE_W)}x${String(SCENE_H)}`,
    `xc:${PLATE}`,
    frame,
    '-compose',
    'Lighten',
    '-composite',
    frame,
  ])
}

function featherMask(dir: string): string {
  const mask = join(dir, 'feather.png')
  execFileSync('magick', [
    '-size',
    `${String(SCENE_W)}x${String(SCENE_H)}`,
    'xc:white',
    '(',
    '-size',
    `${String(FEATHER)}x${String(SCENE_H)}`,
    '-define',
    'gradient:direction=East',
    'gradient:white-black',
    ')',
    '-gravity',
    'East',
    '-compose',
    'Multiply',
    '-composite',
    '(',
    '-size',
    `${String(SCENE_W)}x${String(FEATHER)}`,
    '-define',
    'gradient:direction=South',
    'gradient:white-black',
    ')',
    '-gravity',
    'South',
    '-compose',
    'Multiply',
    '-composite',
    mask,
  ])
  return mask
}

function feather(frame: string, mask: string): void {
  execFileSync('magick', [
    '-size',
    `${String(SCENE_W)}x${String(SCENE_H)}`,
    `xc:${PLATE}`,
    frame,
    mask,
    '-compose',
    'Over',
    '-composite',
    frame,
  ])
}

function main(): void {
  requireEncoders()
  const dir = mkdtempSync(join(tmpdir(), 'sig-scene-'))
  mkdirSync(OUT_DIR, { recursive: true })
  try {
    const sweep = renderSweep(dir)
    const last = sweep.at(-1)
    if (!last) throw new Error('ffmpeg produced no sweep frames')
    const lit = renderLit(dir, sweep)
    const frames = [...sweep, ...renderFade(dir, last, lit), lit]
    for (const frame of [...sweep, lit]) dimPines(frame)
    const mask = featherMask(dir)
    for (const frame of frames) {
      plate(frame)
      feather(frame, mask)
    }
    execFileSync('magick', [
      '-delay',
      String(HOLD_DELAY_CS),
      lit,
      '-delay',
      String(FRAME_DELAY_CS),
      ...frames,
      '-loop',
      '1',
      '-colors',
      String(COLORS),
      OUT,
    ])
    renderVideo(dir, [lit, ...frames])
    const bytes = statSync(OUT).size
    if (bytes > MAX_BYTES)
      throw new Error(`scene.gif is ${String(bytes)} bytes, over ${String(MAX_BYTES)}`)
    console.log(
      `wrote scene.gif ${String(bytes)} bytes, ${String(frames.length + 1)} frames, plays once`,
    )
    for (const file of [OUT_WEBM, OUT_MP4]) {
      console.log(
        `wrote ${file.slice(OUT_DIR.length + 1)} ${String(statSync(file).size)} bytes`,
      )
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
