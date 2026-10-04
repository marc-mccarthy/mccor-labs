import { describe, expect, it } from 'vitest'
import { buildNodeLayout, LATTICE_SEED, NODE_COUNT } from './nodeLattice'

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
})
