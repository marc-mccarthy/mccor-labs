const SCATTER_RADIUS = 3

function unit(index: number, salt: number): number {
  let h = Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d)
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export function buildScatterPositions(count: number): Float32Array {
  const scatter = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    for (let axis = 0; axis < 3; axis++) {
      scatter[i * 3 + axis] = (unit(i, axis) * 2 - 1) * SCATTER_RADIUS
    }
  }
  return scatter
}

export function buildSeeds(count: number): Float32Array {
  const seeds = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    seeds[i] = unit(i, 3)
  }
  return seeds
}
