import { mulberry32 } from './random'

export const PIPELINE_SEED = 0x70697065
export const PARTICLE_COUNT = 240
export const ROW_CENTER = 28 / 160
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
