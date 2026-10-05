import { describe, expect, it } from 'vitest'
import { buildScatterPositions, buildSeeds } from './stagAttributes'

describe('stagAttributes', () => {
  it('is deterministic across calls', () => {
    expect(buildScatterPositions(64)).toEqual(buildScatterPositions(64))
    expect(buildSeeds(64)).toEqual(buildSeeds(64))
  })

  it('keeps seeds in [0, 1) and scatter inside the radius', () => {
    for (const seed of buildSeeds(2000)) {
      expect(seed).toBeGreaterThanOrEqual(0)
      expect(seed).toBeLessThan(1)
    }
    for (const value of buildScatterPositions(2000)) {
      expect(Math.abs(value)).toBeLessThanOrEqual(3)
    }
  })

  it('spreads values rather than collapsing them', () => {
    expect(new Set(buildSeeds(2000)).size).toBeGreaterThan(1900)
  })

  it('sizes the arrays from the point count', () => {
    expect(buildScatterPositions(10)).toHaveLength(30)
    expect(buildSeeds(10)).toHaveLength(10)
  })
})
