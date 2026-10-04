export const NODE_COUNT = 96
export const LATTICE_SEED = 0x6d63636f
const NEIGHBOURS = 2
const EXTENT_X = 7
const EXTENT_Y = 3.2
const EXTENT_Z = 2.4

export interface NodeLayout {
  positions: Float32Array
  edges: Uint16Array
  minX: number
  rangeX: number
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function scatter(seed: number, count: number): Float32Array {
  const random = mulberry32(seed)
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() * 2 - 1) * EXTENT_X
    positions[i * 3 + 1] = (random() * 2 - 1) * EXTENT_Y
    positions[i * 3 + 2] = (random() * 2 - 1) * EXTENT_Z
  }
  return positions
}

function distanceSquared(positions: Float32Array, a: number, b: number): number {
  const dx = (positions[a * 3] ?? 0) - (positions[b * 3] ?? 0)
  const dy = (positions[a * 3 + 1] ?? 0) - (positions[b * 3 + 1] ?? 0)
  const dz = (positions[a * 3 + 2] ?? 0) - (positions[b * 3 + 2] ?? 0)
  return dx * dx + dy * dy + dz * dz
}

function nearest(positions: Float32Array, count: number, from: number): number[] {
  return Array.from({ length: count }, (_, index) => index)
    .filter((index) => index !== from)
    .sort(
      (a, b) =>
        distanceSquared(positions, from, a) - distanceSquared(positions, from, b) ||
        a - b,
    )
    .slice(0, NEIGHBOURS)
}

function buildEdges(positions: Float32Array, count: number): Uint16Array {
  const seen = new Set<number>()
  const pairs: number[] = []
  for (let from = 0; from < count; from++) {
    for (const to of nearest(positions, count, from)) {
      const low = Math.min(from, to)
      const high = Math.max(from, to)
      const key = low * count + high
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push(low, high)
    }
  }
  return Uint16Array.from(pairs)
}

export function buildNodeLayout(seed: number, count: number): NodeLayout {
  const positions = scatter(seed, count)
  let minX = Infinity
  let maxX = -Infinity
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3] ?? 0
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
  }
  return {
    positions,
    edges: buildEdges(positions, count),
    minX,
    rangeX: maxX - minX,
  }
}
