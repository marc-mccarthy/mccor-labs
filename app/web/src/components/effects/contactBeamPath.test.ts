import { describe, expect, it } from 'vitest'
import {
  arcLengths,
  beamLayout,
  bendOffset,
  bendPath,
  bendWeights,
  coverCrop,
  MAX_BEND_FRACTION,
  OBJECT_RIGHT,
  OCCLUDER,
  ORB,
  SAMPLES_PER_SPAN,
  sampleSpline,
  toCanvas,
  toUv,
  TRAIL_ANCHORS,
} from './contactBeamPath'

const BANDS = [
  { label: '768', width: 768, height: 614.4, orb: { x: 0.53244, y: 0.53222 } },
  { label: '1024', width: 1024, height: 460.8, orb: { x: 0.72604, y: 0.53356 } },
  { label: '1440', width: 1440, height: 540, orb: { x: 0.72604, y: 0.54028 } },
] as const

describe('contactBeamPath', () => {
  it('crops a 1920x900 source like object-cover object-right', () => {
    expect(coverCrop(1440, 540)).toEqual({ scale: 0.75, offsetX: 0, offsetY: -67.5 })
    const tall = coverCrop(768, 614.4)
    expect(tall.scale).toBeCloseTo(614.4 / 900, 10)
    expect(tall.offsetX).toBeCloseTo(768 - (1920 * 614.4) / 900, 6)
    expect(tall.offsetY).toBe(0)
  })

  it('honours an object-position override', () => {
    const left = coverCrop(768, 614.4, { x: 0, y: 0.5 })
    expect(left.offsetX).toBeCloseTo(0, 10)
    const centre = coverCrop(768, 614.4, { x: 0.5, y: 0.5 })
    expect(centre.offsetX).toBeCloseTo(coverCrop(768, 614.4).offsetX / 2, 6)
  })

  it.each(BANDS)(
    'maps the orb to its measured uv at $label',
    ({ width, height, orb }) => {
      const uv = toUv(ORB, width, height)
      expect(uv.x).toBeCloseTo(orb.x, 4)
      expect(uv.y).toBeCloseTo(orb.y, 4)
    },
  )

  it.each(BANDS)(
    'keeps the orb, the occluding node and the trail end inside the band at $label',
    ({ width, height }) => {
      const end = TRAIL_ANCHORS.at(-1)!
      for (const point of [ORB, OCCLUDER, end]) {
        const uv = toUv(point, width, height, OBJECT_RIGHT)
        expect(uv.x).toBeGreaterThanOrEqual(0)
        expect(uv.x).toBeLessThanOrEqual(1)
        expect(uv.y).toBeGreaterThanOrEqual(0)
        expect(uv.y).toBeLessThanOrEqual(1)
      }
    },
  )

  it.each(BANDS)(
    'starts the trail at or beyond the left edge, behind the heading, at $label',
    ({ width, height }) => {
      const start = toUv(TRAIL_ANCHORS[0]!, width, height)
      expect(start.x).toBeLessThanOrEqual(0)
      expect(start.y).toBeGreaterThan(0)
      expect(start.y).toBeLessThan(0.5)
    },
  )

  it('maps image pixels to canvas pixels with the crop scale and offset', () => {
    const crop = coverCrop(1024, 460.8)
    expect(toCanvas({ x: 1920, y: 450 }, crop)).toEqual({
      x: 1024,
      y: crop.offsetY + 450 * crop.scale,
    })
  })

  it('passes the spline through every anchor', () => {
    const anchors = [...TRAIL_ANCHORS, ORB]
    const samples = sampleSpline(anchors)
    expect(samples).toHaveLength((anchors.length - 1) * SAMPLES_PER_SPAN + 1)
    anchors.forEach((anchor, index) => {
      const sample = samples[index * SAMPLES_PER_SPAN]!
      expect(sample.x).toBeCloseTo(anchor.x, 6)
      expect(sample.y).toBeCloseTo(anchor.y, 6)
    })
  })

  it('rejects a spline with fewer than two anchors', () => {
    expect(() => sampleSpline([ORB])).toThrow('at least two anchors')
  })

  it('accumulates arc length and pins the bend at both ends', () => {
    const arcs = arcLengths([
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 3, y: 10 },
    ])
    expect(arcs).toEqual([0, 5, 11])
    const weights = bendWeights(arcs)
    expect(weights[0]).toBe(0)
    expect(weights[2]).toBeCloseTo(0, 10)
    expect(weights[1]).toBeGreaterThan(0)
  })

  it('caps the pointer bend at 4% of the band width in any direction', () => {
    expect(MAX_BEND_FRACTION).toBe(0.04)
    const diagonal = bendOffset({ x: 1, y: 1 }, 1440)
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(57.6, 6)
    expect(bendOffset({ x: 0.5, y: 0 }, 1000)).toEqual({ x: 20, y: 0 })
    const layout = beamLayout(1440, 540)
    const bent = bendPath(layout.path, layout.weights, bendOffset({ x: 3, y: -4 }, 1440))
    const shifts = bent.map((point, index) =>
      Math.hypot(point.x - layout.path[index]!.x, point.y - layout.path[index]!.y),
    )
    expect(Math.max(...shifts)).toBeLessThanOrEqual(1440 * MAX_BEND_FRACTION + 1e-9)
    expect(shifts[0]).toBe(0)
    expect(shifts.at(-1)).toBeCloseTo(0, 9)
  })

  it.each(BANDS)('lays the beam out in canvas pixels at $label', ({ width, height }) => {
    const layout = beamLayout(width, height)
    const crop = coverCrop(width, height)
    expect(layout.scale).toBe(crop.scale)
    expect(layout.path.at(-1)!.x).toBeCloseTo(layout.orb.x, 6)
    expect(layout.path.at(-1)!.y).toBeCloseTo(layout.orb.y, 6)
    expect(layout.orb.radius).toBeCloseTo(ORB.radius * crop.scale, 6)
    expect(layout.occluder.radius).toBeCloseTo(OCCLUDER.radius * crop.scale, 6)
    expect(layout.arcs).toHaveLength(layout.path.length)
    expect(layout.weights).toHaveLength(layout.path.length)
  })
})
