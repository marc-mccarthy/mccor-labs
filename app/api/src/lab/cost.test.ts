import { describe, expect, it } from 'vitest'

import { BUDGET_USD, REJECTED_POSTS_USD_PER_10M } from '../config'
import {
  guardrailCostUsd,
  lambdaCostUsd,
  modelCostUsd,
  textUnits,
  worstCaseArgueUsd,
  worstCaseMonthlyUsd,
  worstCaseRaceUsd,
} from './cost'

describe('textUnits', () => {
  it('bills at least one unit and rounds up per 1,000 characters', () => {
    expect(textUnits(0)).toBe(1)
    expect(textUnits(1000)).toBe(1)
    expect(textUnits(1001)).toBe(2)
    expect(textUnits(2700)).toBe(3)
  })
})

describe('unit costs', () => {
  it('prices model tokens', () => {
    expect(modelCostUsd({ inputTokens: 1000, outputTokens: 1000 })).toBeCloseTo(
      0.00308,
      8,
    )
  })

  it('prices guardrail units', () => {
    expect(guardrailCostUsd(4)).toBeCloseTo(0.0006, 8)
  })

  it('prices lambda time at 512 MB plus the request', () => {
    expect(lambdaCostUsd(15000)).toBeCloseTo(0.0001002005, 8)
  })
})

describe('worst case', () => {
  it('matches the plan figures per run', () => {
    expect(worstCaseRaceUsd()).toBeCloseTo(0.0026202005, 8)
    expect(worstCaseArgueUsd()).toBeCloseTo(0.0022982005, 8)
  })

  it('matches the plan figure per month', () => {
    expect(worstCaseMonthlyUsd()).toBeCloseTo(11.185732325, 6)
  })

  it('stays under the account budget with rejected posts added', () => {
    expect(worstCaseMonthlyUsd() + REJECTED_POSTS_USD_PER_10M).toBeLessThan(BUDGET_USD)
  })
})
