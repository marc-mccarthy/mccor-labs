import { describe, expect, it } from 'vitest'
import { median } from './lighthouse'

describe('median', () => {
  it('returns the middle value for an odd count', () => {
    expect(median([10, 30, 20])).toBe(20)
  })

  it('averages the two middle values for an even count', () => {
    expect(median([40, 10, 20, 30])).toBe(25)
  })

  it('does not depend on input order and does not mutate it', () => {
    const input = [9, 1, 5, 3, 7]
    expect(median(input)).toBe(5)
    expect(input).toEqual([9, 1, 5, 3, 7])
  })

  it('returns the only value for a single run', () => {
    expect(median([42])).toBe(42)
  })
})
