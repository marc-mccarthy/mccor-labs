import { describe, expect, it } from 'vitest'
import {
  RUNS_PER_MONTH,
  formatMonthlyUsd,
  formatMs,
  formatText,
  formatTokens,
  formatUsd,
  monthlyModelUsd,
} from './labCost'

describe('formatUsd', () => {
  it.each([
    [0.00009, 'under 0.0001'],
    [0, 'under 0.0001'],
    [0.0001, '0.0001'],
    [0.0026202, '0.0026'],
    [0.00338, '0.0034'],
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

  it('keeps small amounts readable instead of rounding to 0.00', () => {
    expect(formatMonthlyUsd(0.0004)).toEqual({ value: '0.0004', unit: 'USD' })
    expect(formatMonthlyUsd(0.00001)).toEqual({ value: 'under 0.0001', unit: 'USD' })
  })
})

describe('formatMs', () => {
  it('shows milliseconds under a second and seconds from a second up', () => {
    expect(formatMs(4)).toEqual({ value: '4', unit: 'ms' })
    expect(formatMs(999.4)).toEqual({ value: '999', unit: 'ms' })
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
    expect(formatText(formatUsd(0.0026202))).toBe('0.0026 USD')
    expect(formatText(formatUsd(0.00001))).toBe('under 0.0001 USD')
    expect(formatText(formatMs(1234))).toBe('1.23 s')
  })
})

describe('monthlyModelUsd', () => {
  it('projects the per-example cost over the runs per month', () => {
    expect(monthlyModelUsd(0.002, 5, 'daily')).toBeCloseTo(0.012, 10)
    expect(monthlyModelUsd(0.002, 5, 'weekly')).toBeCloseTo(0.0017333, 6)
    expect(monthlyModelUsd(0.002, 5, 'monthly-or-less')).toBeCloseTo(0.0004, 10)
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
})
