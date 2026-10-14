export interface Point {
  readonly x: number
  readonly y: number
}

export interface Circle extends Point {
  readonly radius: number
}

export interface ObjectPosition {
  readonly x: number
  readonly y: number
}

export interface CoverCrop {
  readonly scale: number
  readonly offsetX: number
  readonly offsetY: number
}

export interface BeamLayout {
  readonly scale: number
  readonly path: readonly Point[]
  readonly arcs: readonly number[]
  readonly weights: readonly number[]
  readonly orb: Circle
  readonly occluder: Circle
}

export const SOURCE_SIZE = { width: 1920, height: 900 } as const

export const OBJECT_RIGHT: ObjectPosition = { x: 1, y: 0.5 }

export const TRAIL_ANCHORS: readonly Point[] = [
  { x: 0, y: 664 },
  { x: 200, y: 655 },
  { x: 400, y: 644 },
  { x: 600, y: 632 },
  { x: 760, y: 617 },
  { x: 880, y: 598 },
  { x: 980, y: 570 },
  { x: 1060, y: 538 },
  { x: 1120, y: 511 },
  { x: 1200, y: 485 },
  { x: 1280, y: 458 },
  { x: 1330, y: 444 },
]

export const ORB: Circle = { x: 1394, y: 421, radius: 62 }

export const OCCLUDER: Circle = { x: 1157, y: 466, radius: 33 }

export const SAMPLES_PER_SPAN = 3

export const MAX_BEND_FRACTION = 0.04

export function coverCrop(
  width: number,
  height: number,
  position: ObjectPosition = OBJECT_RIGHT,
): CoverCrop {
  const scale = Math.max(width / SOURCE_SIZE.width, height / SOURCE_SIZE.height)
  return {
    scale,
    offsetX: (width - SOURCE_SIZE.width * scale) * position.x,
    offsetY: (height - SOURCE_SIZE.height * scale) * position.y,
  }
}

export function toCanvas(point: Point, crop: CoverCrop): Point {
  return {
    x: crop.offsetX + point.x * crop.scale,
    y: crop.offsetY + point.y * crop.scale,
  }
}

export function toUv(
  point: Point,
  width: number,
  height: number,
  position: ObjectPosition = OBJECT_RIGHT,
): Point {
  const canvasPoint = toCanvas(point, coverCrop(width, height, position))
  return { x: canvasPoint.x / width, y: 1 - canvasPoint.y / height }
}

function at(points: readonly Point[], index: number): Point {
  const clamped = Math.max(0, Math.min(points.length - 1, index))
  const point = points[clamped]
  if (!point) throw new Error(`No point at index ${String(clamped)}`)
  return point
}

function extend(points: readonly Point[], index: number): Point {
  if (index >= 0 && index < points.length) return at(points, index)
  const edge = index < 0 ? 0 : points.length - 1
  const inner = index < 0 ? 1 : points.length - 2
  const a = at(points, edge)
  const b = at(points, inner)
  return { x: 2 * a.x - b.x, y: 2 * a.y - b.y }
}

function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t
  const t3 = t2 * t
  const axis = (a: number, b: number, c: number, d: number) =>
    0.5 *
    (2 * b +
      (c - a) * t +
      (2 * a - 5 * b + 4 * c - d) * t2 +
      (3 * b - a - 3 * c + d) * t3)
  return { x: axis(p0.x, p1.x, p2.x, p3.x), y: axis(p0.y, p1.y, p2.y, p3.y) }
}

export function sampleSpline(
  anchors: readonly Point[],
  samplesPerSpan: number = SAMPLES_PER_SPAN,
): Point[] {
  if (anchors.length < 2) throw new Error('A spline needs at least two anchors')
  const samples: Point[] = []
  for (let span = 0; span < anchors.length - 1; span++) {
    const p0 = extend(anchors, span - 1)
    const p1 = at(anchors, span)
    const p2 = at(anchors, span + 1)
    const p3 = extend(anchors, span + 2)
    for (let step = 0; step < samplesPerSpan; step++) {
      samples.push(catmullRom(p0, p1, p2, p3, step / samplesPerSpan))
    }
  }
  samples.push(at(anchors, anchors.length - 1))
  return samples
}

export function arcLengths(points: readonly Point[]): number[] {
  const arcs = [0]
  for (let index = 1; index < points.length; index++) {
    const a = at(points, index - 1)
    const b = at(points, index)
    arcs.push((arcs[index - 1] ?? 0) + Math.hypot(b.x - a.x, b.y - a.y))
  }
  return arcs
}

export function bendWeights(arcs: readonly number[]): number[] {
  const total = arcs.at(-1) ?? 0
  if (total === 0) return arcs.map(() => 0)
  return arcs.map((arc) => Math.sin((Math.PI * arc) / total))
}

export function bendOffset(bend: Point, width: number): Point {
  const length = Math.hypot(bend.x, bend.y)
  const unit = length > 1 ? 1 / length : 1
  const reach = MAX_BEND_FRACTION * width * unit
  return { x: bend.x * reach, y: bend.y * reach }
}

export function bendPath(
  path: readonly Point[],
  weights: readonly number[],
  offset: Point,
): Point[] {
  return path.map((point, index) => {
    const weight = weights[index] ?? 0
    return { x: point.x + offset.x * weight, y: point.y + offset.y * weight }
  })
}

export function beamLayout(
  width: number,
  height: number,
  position: ObjectPosition = OBJECT_RIGHT,
): BeamLayout {
  const crop = coverCrop(width, height, position)
  const anchors = [...TRAIL_ANCHORS, ORB].map((point) => toCanvas(point, crop))
  const path = sampleSpline(anchors)
  const arcs = arcLengths(path)
  const circle = (source: Circle): Circle => ({
    ...toCanvas(source, crop),
    radius: source.radius * crop.scale,
  })
  return {
    scale: crop.scale,
    path,
    arcs,
    weights: bendWeights(arcs),
    orb: circle(ORB),
    occluder: circle(OCCLUDER),
  }
}
