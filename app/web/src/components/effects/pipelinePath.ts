import {
  DIAGRAM_HEIGHT,
  PACKET_END,
  PACKET_LEAD,
  PACKET_START,
  STAGE_GAP,
} from '@/components/substance/PipelineDiagram'
import { mulberry32 } from './random'

export { PACKET_END, PACKET_LEAD, PACKET_START }

export const PIPELINE_SEED = 0x70697065
export const PARTICLE_COUNT = 240
export const PACKET_COUNT = 40
export const PACKET_GATHER = 0.05
export const PACKET_TAIL = 0.6
export const ROW_CENTER = DIAGRAM_HEIGHT / 2 / STAGE_GAP
export const BAND = 0.08

export function buildParticles(seed: number, count: number): Float32Array {
  const random = mulberry32(seed)
  const particles = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    particles[i * 3] = random()
    particles[i * 3 + 1] = random() * 2 - 1
    particles[i * 3 + 2] = random()
  }
  return particles
}

export function buildPacketFlags(count: number, packetCount: number): Float32Array {
  const flags = new Float32Array(count)
  flags.fill(1, 0, Math.min(count, Math.max(0, packetCount)))
  return flags
}
