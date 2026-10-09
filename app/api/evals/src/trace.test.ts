import { describe, expect, it } from 'vitest'

import { costUsd, RUN_ID, totals, traceFileName, type CaseResult } from './trace'

function result(overrides: Partial<CaseResult>): CaseResult {
  return {
    id: 'race-one',
    kind: 'race',
    pass: true,
    code: { pass: true, checks: [] },
    judge: null,
    output: 'a, b',
    inputTokens: 0,
    outputTokens: 0,
    guardrailTextUnits: 0,
    latencyMs: 0,
    costUsd: 0,
    ...overrides,
  }
}

describe('costUsd', () => {
  it('adds model tokens and guardrail units at the config prices', () => {
    expect(costUsd(1000, 1000, 2)).toBe(0.00338)
  })

  it('is zero for no usage and rounds to 8 decimals', () => {
    expect(costUsd(0, 0, 0)).toBe(0)
    expect(costUsd(1, 1, 1)).toBe(0.00015308)
    expect(String(costUsd(7, 3, 1)).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(8)
  })
})

describe('totals', () => {
  it('sums tokens and cost and counts passes and failures', () => {
    const cases = [
      result({ inputTokens: 100, outputTokens: 20, costUsd: 0.1 }),
      result({ pass: false, inputTokens: 50, outputTokens: 5, costUsd: 0.2 }),
      result({ inputTokens: 1, outputTokens: 2, costUsd: 0.3 }),
    ]
    expect(totals(cases)).toEqual({
      cases: 3,
      passed: 2,
      failed: 1,
      inputTokens: 151,
      outputTokens: 27,
      costUsd: 0.6,
    })
  })

  it('handles no cases', () => {
    expect(totals([])).toEqual({
      cases: 0,
      passed: 0,
      failed: 0,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
    })
  })
})

describe('traceFileName', () => {
  it('joins the date and run id', () => {
    expect(traceFileName({ date: '2026-10-09', runId: '123-1' })).toBe(
      '2026-10-09-123-1.json',
    )
  })

  it.each([
    ['a path in the run id', { date: '2026-10-09', runId: '../x' }],
    ['an empty run id', { date: '2026-10-09', runId: '' }],
    ['a long run id', { date: '2026-10-09', runId: 'a'.repeat(41) }],
    ['month 13', { date: '2026-13-01', runId: 'x' }],
    ['day 31 in April', { date: '2026-04-31', runId: 'x' }],
    ['a short date', { date: '2026-1-1', runId: 'x' }],
    ['a path in the date', { date: '../2026-10-09', runId: 'x' }],
  ])('rejects %s', (_, input) => {
    expect(() => traceFileName(input)).toThrow()
  })
})

describe('RUN_ID', () => {
  it('allows letters, digits and hyphens up to 40', () => {
    expect(RUN_ID.test('Ab-12')).toBe(true)
    expect(RUN_ID.test('a'.repeat(40))).toBe(true)
    expect(RUN_ID.test('a_b')).toBe(false)
  })
})
