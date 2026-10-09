import { describe, expect, it } from 'vitest'
import {
  ARGUE,
  CAPS,
  FOUNDATION_MODEL_ID,
  KILL_FLAG,
  MODEL_ID,
  PRICES,
  PROFILE_REGIONS,
  RACE,
  VERDICT_IDS,
  VERDICT_LABELS,
} from './config'

describe('config', () => {
  it('pins the Nova 2 Lite US profile and its foundation model', () => {
    expect(MODEL_ID).toBe('us.amazon.nova-2-lite-v1:0')
    expect(FOUNDATION_MODEL_ID).toBe('amazon.nova-2-lite-v1:0')
    expect(PROFILE_REGIONS).toEqual(['us-east-1', 'us-east-2', 'us-west-2'])
  })

  it('holds the verified prices', () => {
    expect(PRICES.inputPer1kTokensUsd).toBe(0.00033)
    expect(PRICES.outputPer1kTokensUsd).toBe(0.00275)
    expect(PRICES.guardrailPer1kUnitsUsd).toBe(0.15)
  })

  it('holds the spec caps and limits', () => {
    expect(CAPS).toEqual({ raceDaily: 50, argueDaily: 100, counterTtlDays: 7 })
    expect(RACE.maxExamples).toBe(5)
    expect(RACE.maxInputChars).toBe(500)
    expect(ARGUE.maxSummaryChars).toBe(300)
    expect(ARGUE.maxOutputTokens).toBe(400)
    expect(KILL_FLAG.cacheMs).toBe(60_000)
  })

  it('labels every verdict id', () => {
    expect(VERDICT_IDS).toEqual([
      'plain-code',
      'rules',
      'classic-ml',
      'language-model',
      'do-not-automate',
      'unclear',
    ])
    for (const id of VERDICT_IDS) expect(VERDICT_LABELS[id].length).toBeGreaterThan(0)
  })
})
