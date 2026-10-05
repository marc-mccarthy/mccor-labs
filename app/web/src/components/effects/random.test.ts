import { describe, expect, it } from 'vitest'
import { mulberry32 } from './random'

describe('mulberry32', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('stays within [0, 1)', () => {
    const random = mulberry32(7)
    for (let i = 0; i < 100; i++) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})
