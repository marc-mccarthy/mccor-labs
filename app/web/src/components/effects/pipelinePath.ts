import { mulberry32 } from './random'

export const PIPELINE_SEED = 0x70697065
export const CLOUD_COUNT = 240
const STAGE_SPACING = 3
const CLOUD_RADIUS = 2.2

export function stagePosition(index: number): [number, number, number] {
  return [
    Math.sin(index * 1.1) * 1.2,
    Math.cos(index * 0.9) * 0.5,
    -index * STAGE_SPACING,
  ]
}

export function buildCloud(
  seed: number,
  count: number,
  stageCount: number,
): Float32Array {
  const random = mulberry32(seed)
  const depth = Math.max(stageCount - 1, 1) * STAGE_SPACING
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() * 2 - 1) * CLOUD_RADIUS
    positions[i * 3 + 1] = (random() * 2 - 1) * CLOUD_RADIUS
    positions[i * 3 + 2] = -random() * depth
  }
  return positions
}
