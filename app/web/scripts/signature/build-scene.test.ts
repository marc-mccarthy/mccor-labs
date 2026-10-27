import { describe, expect, it } from 'vitest'
import { missingEncoders, videoArgs } from './build-scene'

describe('build-scene video encoding', () => {
  it('names every encoder ffmpeg lacks', () => {
    const list =
      ' V....D libvpx-vp9           libvpx VP9\n V....D libx264              H.264\n'
    expect(missingEncoders(list)).toEqual(['hevc_videotoolbox'])
    expect(
      missingEncoders(`${list} V....D hevc_videotoolbox    VideoToolbox H.265\n`),
    ).toEqual([])
  })

  it('encodes both videos with an alpha pixel format and even dimensions', () => {
    const webm = videoArgs('frames/video-%03d.png', 'webm')
    const mp4 = videoArgs('frames/video-%03d.png', 'mp4')
    expect(webm).toContain('yuva420p')
    expect(mp4).toContain('bgra')
    expect(mp4).toContain('-alpha_quality')
    for (const args of [webm, mp4]) {
      expect(args[args.indexOf('-vf') + 1]).toMatch(
        /^pad=ceil\(iw\/2\)\*2:ceil\(ih\/2\)\*2/,
      )
    }
    expect(webm.at(-1)).toMatch(/scene\.webm$/)
    expect(mp4.at(-1)).toMatch(/scene\.mp4$/)
  })
})
