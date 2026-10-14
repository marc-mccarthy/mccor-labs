import { describe, expect, it } from 'vitest'
import { roundStagExit, stagExitAmount } from './stagExit'

const HEIGHT = 765

describe('stagExitAmount', () => {
  it('is zero at the top of the page', () => {
    expect(stagExitAmount(0, HEIGHT)).toBe(0)
  })

  it('stays zero until a third of the hero has scrolled past', () => {
    expect(stagExitAmount(0.3 * HEIGHT, HEIGHT)).toBe(0)
  })

  it('is well under way at 0.8 of the hero height', () => {
    expect(stagExitAmount(0.8 * HEIGHT, HEIGHT)).toBeGreaterThan(0.5)
  })

  it('rises monotonically with scroll', () => {
    let previous = -1
    for (let y = 0; y <= HEIGHT * 1.2; y += 5) {
      const amount = stagExitAmount(y, HEIGHT)
      expect(amount).toBeGreaterThanOrEqual(previous)
      previous = amount
    }
  })

  it('clamps to the unit range outside the hero', () => {
    expect(stagExitAmount(-200, HEIGHT)).toBe(0)
    expect(stagExitAmount(0.9 * HEIGHT, HEIGHT)).toBe(1)
    expect(stagExitAmount(5 * HEIGHT, HEIGHT)).toBe(1)
  })

  it('returns zero for an unmeasured hero', () => {
    expect(stagExitAmount(400, 0)).toBe(0)
    expect(stagExitAmount(400, Number.NaN)).toBe(0)
  })
})

describe('roundStagExit', () => {
  it('rounds to one decimal without a trailing zero', () => {
    expect(roundStagExit(0)).toBe('0')
    expect(roundStagExit(0.04)).toBe('0')
    expect(roundStagExit(0.46)).toBe('0.5')
    expect(roundStagExit(1)).toBe('1')
  })
})
