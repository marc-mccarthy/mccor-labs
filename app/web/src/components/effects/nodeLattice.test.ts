import { describe, expect, it } from 'vitest'
import {
  buildNodeLayout,
  GATE_FLASH_MS,
  gatesPassed,
  gateThresholds,
  HEADLINE_CLEAR_MIN_X,
  LATTICE_SEED,
  NODE_COUNT,
  stepGateFlash,
} from './nodeLattice'

describe('buildNodeLayout', () => {
  it('is deterministic for the same seed', () => {
    const a = buildNodeLayout(LATTICE_SEED, NODE_COUNT)
    const b = buildNodeLayout(LATTICE_SEED, NODE_COUNT)
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions))
    expect(Array.from(a.edges)).toEqual(Array.from(b.edges))
  })

  it('differs for a different seed', () => {
    const a = buildNodeLayout(LATTICE_SEED, NODE_COUNT)
    const b = buildNodeLayout(LATTICE_SEED + 1, NODE_COUNT)
    expect(Array.from(a.positions)).not.toEqual(Array.from(b.positions))
  })

  it('places every node and wires only valid, unique edges', () => {
    const { positions, edges, rangeX } = buildNodeLayout(LATTICE_SEED, NODE_COUNT)
    expect(positions).toHaveLength(NODE_COUNT * 3)
    expect(rangeX).toBeGreaterThan(0)
    expect(edges.length % 2).toBe(0)
    expect(Math.max(...edges)).toBeLessThan(NODE_COUNT)
    const keys = new Set<string>()
    for (let i = 0; i < edges.length; i += 2) {
      keys.add(`${String(edges[i])}-${String(edges[i + 1])}`)
    }
    expect(keys.size).toBe(edges.length / 2)
  })

  it('keeps every node right of the clamp when one is given, deterministically', () => {
    const a = buildNodeLayout(LATTICE_SEED, NODE_COUNT, HEADLINE_CLEAR_MIN_X)
    const b = buildNodeLayout(LATTICE_SEED, NODE_COUNT, HEADLINE_CLEAR_MIN_X)
    const xs = Array.from(a.positions).filter((_, index) => index % 3 === 0)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(HEADLINE_CLEAR_MIN_X)
    expect(a.minX).toBeGreaterThanOrEqual(HEADLINE_CLEAR_MIN_X)
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions))
    const full = buildNodeLayout(LATTICE_SEED, NODE_COUNT)
    expect(full.minX).toBeLessThan(0)
  })
})

describe('gateThresholds', () => {
  it('spreads the three gates across the sticky window of a 150vh pin', () => {
    const thresholds = gateThresholds(150)
    expect(thresholds).toHaveLength(3)
    expect(thresholds[0]).toBeCloseTo(0.43, 5)
    expect(thresholds[1]).toBeCloseTo(0.5, 5)
    expect(thresholds[2]).toBeCloseTo(0.57, 5)
  })

  it('keeps every gate inside the sticky window for any pin height', () => {
    for (const pinUnits of [150, 200]) {
      const start = 100 / (100 + pinUnits)
      const end = pinUnits / (100 + pinUnits)
      for (const threshold of gateThresholds(pinUnits)) {
        expect(threshold).toBeGreaterThan(start)
        expect(threshold).toBeLessThan(end)
      }
    }
  })
})

describe('gatesPassed', () => {
  const thresholds = [0.43, 0.5, 0.57]

  it.each([
    [0, 0],
    [0.4, 0],
    [0.4299, 0],
    [0.43, 1],
    [0.47, 1],
    [0.5, 2],
    [0.56, 2],
    [0.57, 3],
    [0.6, 3],
    [1, 3],
  ])('at progress %s passes %s gates', (progress, passed) => {
    expect(gatesPassed(progress, thresholds)).toBe(passed)
  })

  it('passes nothing when there are no gates', () => {
    expect(gatesPassed(1, [])).toBe(0)
  })
})

describe('stepGateFlash', () => {
  it.each([
    ['fires on a newly passed gate', 0, 1, 2, 16, 1],
    ['refires while still decaying', 0.4, 2, 3, 16, 1],
    ['decays linearly between passes', 1, 1, 1, GATE_FLASH_MS / 4, 0.75],
    ['never decays below zero', 0.1, 3, 3, GATE_FLASH_MS, 0],
    ['does not fire when scrolling back up', 0, 2, 1, 16, 0],
    ['does not fire on a frame resumed after a hold', 0, 0, 2, 0, 0],
    ['holds its value on a frame resumed after a hold', 0.5, 1, 1, 0, 0.5],
  ])('%s', (_case, flash, wasPassed, nowPassed, delta, expected) => {
    expect(stepGateFlash(flash, wasPassed, nowPassed, delta)).toBeCloseTo(expected, 5)
  })
})
