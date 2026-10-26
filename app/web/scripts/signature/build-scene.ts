import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = import.meta.dirname
const WEB = join(HERE, '..', '..')
const SOURCE = join(HERE, 'scene-source.mp4')
const OUT_DIR = join(WEB, 'public', 'sig')
const OUT = join(OUT_DIR, 'scene.gif')

export const SCENE_W = 596
export const SCENE_H = 310
const CROP = { w: 760, h: 395, x: 260, y: 75 }
const FPS = 10
const SWEEP_END_S = 2.4
const SWEEP_SLOWDOWN = 0.625
const FINALE_START_S = 3.33
const FINALE_LEFT_GAIN = 0.55
const FINALE_RIGHT_GAIN = 1.75
const FINALE_CENTRE_GAIN = 1.2
const FINALE_EDGE_FALLOFF = 1.1
const COLORS = 96
const DENOISE = 'hqdn3d=4:3:16:12'
const MAX_BYTES = 500_000
const OPTIMIZE_FUZZ = '8%'
const BLACK_POINT = { r: 0.13, g: 0.16, b: 0.19 }

function filters(): string {
  const crop = `crop=${String(CROP.w)}:${String(CROP.h)}:${String(CROP.x)}:${String(CROP.y)}`
  const levels = `colorlevels=rimin=${String(BLACK_POINT.r)}:gimin=${String(BLACK_POINT.g)}:bimin=${String(BLACK_POINT.b)}`
  const sweep = `[s0]trim=end=${String(SWEEP_END_S)},setpts=${String(SWEEP_SLOWDOWN)}*(PTS-STARTPTS)[a]`
  const evenOut = `geq=lum='min(255,lum(X,Y)*(${String(FINALE_LEFT_GAIN)}+${String(FINALE_RIGHT_GAIN - FINALE_LEFT_GAIN)}*X/W)*(${String(FINALE_CENTRE_GAIN)}-${String(FINALE_EDGE_FALLOFF)}*abs(X/W-0.5)))':cb='cb(X,Y)':cr='cr(X,Y)'`
  const finale = `[s1]trim=start=${String(FINALE_START_S)},setpts=PTS-STARTPTS,${evenOut}[b]`
  const cut = `[0:v]split[s0][s1];${sweep};${finale};[a][b]concat=n=2:v=1:a=0`
  return `${cut},fps=${String(FPS)},${crop},${DENOISE},scale=${String(SCENE_W)}:${String(SCENE_H)}:flags=lanczos,${levels}`
}

function main(): void {
  const dir = mkdtempSync(join(tmpdir(), 'sig-scene-'))
  const palette = join(dir, 'palette.png')
  mkdirSync(OUT_DIR, { recursive: true })
  execFileSync('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-i',
    SOURCE,
    '-lavfi',
    `${filters()},palettegen=max_colors=${String(COLORS)}`,
    palette,
  ])
  execFileSync('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-i',
    SOURCE,
    '-i',
    palette,
    '-lavfi',
    `${filters()} [x]; [x][1:v] paletteuse=dither=none:diff_mode=rectangle`,
    '-loop',
    '-1',
    OUT,
  ])
  execFileSync('magick', [OUT, '-fuzz', OPTIMIZE_FUZZ, '-layers', 'Optimize', OUT])
  rmSync(dir, { recursive: true, force: true })
  const bytes = statSync(OUT).size
  if (bytes > MAX_BYTES)
    throw new Error(`scene.gif is ${String(bytes)} bytes, over ${String(MAX_BYTES)}`)
  console.log(`wrote scene.gif ${String(bytes)} bytes, plays once`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
