import { describe, expect, it } from 'vitest'
import { PRICES } from '../../../api/src/config'
import {
  FIXED_GUARDRAIL_UNITS,
  FIXED_GUARDRAIL_USD,
  GUARDRAIL_PER_1K_UNITS_USD,
  RUNS_PER_MONTH,
  formatMonthlyUsd,
  formatMs,
  formatText,
  formatTokens,
  formatUsd,
  monthlyModelUsd,
} from './labCost'

describe('formatUsd', () => {
  it('shows an exact zero as 0 USD', () => {
    expect(formatText(formatUsd(0))).toBe('0 USD')
  })

  it.each([
    [0.00009, 'under 0.0001'],
    [0, '0'],
    [0.0001, '0.0001'],
    [0.0026202, '0.0027'],
    [0.00338, '0.0034'],
    [0.00334, '0.0034'],
    [0.0003, '0.0003'],
    [0.00030000000000000003, '0.0003'],
    [0.00010000000000000002, '0.0001'],
    [0.00340001, '0.0035'],
  ])('formats %s as %s USD', (input, value) => {
    expect(formatUsd(input)).toEqual({ value, unit: 'USD' })
  })
})

describe('formatMonthlyUsd', () => {
  it('uses two decimals from one cent up', () => {
    expect(formatMonthlyUsd(0.6)).toEqual({ value: '0.60', unit: 'USD' })
    expect(formatMonthlyUsd(0.01)).toEqual({ value: '0.01', unit: 'USD' })
    expect(formatMonthlyUsd(12.345)).toEqual({ value: '12.35', unit: 'USD' })
  })

  it('rounds up to the cent, never down', () => {
    expect(formatMonthlyUsd(12.341)).toEqual({ value: '12.35', unit: 'USD' })
    expect(formatMonthlyUsd(0.0101)).toEqual({ value: '0.02', unit: 'USD' })
    expect(formatMonthlyUsd(0.0192)).toEqual({ value: '0.02', unit: 'USD' })
  })

  it('keeps small amounts readable instead of rounding to 0.00', () => {
    expect(formatMonthlyUsd(0.0004)).toEqual({ value: '0.0004', unit: 'USD' })
    expect(formatMonthlyUsd(0.00001)).toEqual({ value: 'under 0.0001', unit: 'USD' })
  })

  it('compares after rounding, so 0.009999 reads 0.01 and not 0.0100', () => {
    expect(formatMonthlyUsd(0.009999)).toEqual({ value: '0.01', unit: 'USD' })
    expect(formatMonthlyUsd(0.0049)).toEqual({ value: '0.0049', unit: 'USD' })
    expect(formatMonthlyUsd(0.00334)).toEqual({ value: '0.0034', unit: 'USD' })
  })
})

describe('formatMs', () => {
  it('shows milliseconds under a second and seconds from a second up', () => {
    expect(formatMs(4)).toEqual({ value: '4', unit: 'ms' })
    expect(formatMs(999.4)).toEqual({ value: '999', unit: 'ms' })
    expect(formatMs(999.6)).toEqual({ value: '1.00', unit: 's' })
    expect(formatMs(1000)).toEqual({ value: '1.00', unit: 's' })
    expect(formatMs(1234)).toEqual({ value: '1.23', unit: 's' })
  })
})

describe('formatTokens', () => {
  it('groups thousands', () => {
    expect(formatTokens(1234)).toEqual({ value: '1,234', unit: 'tokens' })
    expect(formatTokens(300)).toEqual({ value: '300', unit: 'tokens' })
  })
})

describe('formatText', () => {
  it('joins value and unit with one space', () => {
    expect(formatText(formatUsd(0.0026202))).toBe('0.0027 USD')
    expect(formatText(formatUsd(0.00001))).toBe('under 0.0001 USD')
    expect(formatText(formatMs(1234))).toBe('1.23 s')
  })
})

describe('monthlyModelUsd', () => {
  it('adds the fixed guardrail minimum to the per-item share of the run cost', () => {
    expect(FIXED_GUARDRAIL_USD).toBeCloseTo(0.0003, 12)
    expect(monthlyModelUsd(0.002, 5, 'daily')).toBeCloseTo(0.0192, 10)
    expect(monthlyModelUsd(0.002, 5, 'weekly')).toBeCloseTo(0.00064 * (52 / 12), 10)
    expect(monthlyModelUsd(0.002, 5, 'monthly-or-less')).toBeCloseTo(0.00064, 10)
  })

  it('charges the whole run cost for a single example', () => {
    expect(monthlyModelUsd(0.002, 1, 'daily')).toBeCloseTo(0.06, 10)
    expect(monthlyModelUsd(0.002, 1, 'monthly-or-less')).toBeCloseTo(0.002, 12)
  })

  it('gives no projection without a frequency or examples', () => {
    expect(monthlyModelUsd(0.002, 5, null)).toBeNull()
    expect(monthlyModelUsd(0.002, 0, 'daily')).toBeNull()
  })

  it('pins the runs per month', () => {
    expect(RUNS_PER_MONTH).toEqual({
      daily: 30,
      weekly: 52 / 12,
      'monthly-or-less': 1,
    })
  })

  it('mirrors the guardrail price in app/api config.ts', () => {
    expect(GUARDRAIL_PER_1K_UNITS_USD).toBe(PRICES.guardrailPer1kUnitsUsd)
    expect(FIXED_GUARDRAIL_UNITS).toBe(2)
  })
})
