import { describe, expect, it } from 'vitest'
import { buildParticles, PARTICLE_COUNT, PIPELINE_SEED } from './pipelinePath'

describe('buildParticles', () => {
  it('is deterministic for a seed', () => {
    expect(buildParticles(PIPELINE_SEED, PARTICLE_COUNT)).toEqual(
      buildParticles(PIPELINE_SEED, PARTICLE_COUNT),
    )
  })

  it('gives every particle a phase and seed in [0, 1) and a lane in [-1, 1)', () => {
    const particles = buildParticles(PIPELINE_SEED, PARTICLE_COUNT)
    expect(particles).toHaveLength(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const [phase = -1, lane = -2, seed = -1] = particles.subarray(i * 3, i * 3 + 3)
      expect(phase).toBeGreaterThanOrEqual(0)
      expect(phase).toBeLessThan(1)
      expect(lane).toBeGreaterThanOrEqual(-1)
      expect(lane).toBeLessThan(1)
      expect(seed).toBeGreaterThanOrEqual(0)
      expect(seed).toBeLessThan(1)
    }
  })
})
