import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { VERDICT_IDS } from '../config'
import {
  FEEDBACK_MAX_BYTES,
  FEEDBACK_REASONS,
  RULE_IDS,
  RUBRIC_VERSIONS,
  RULE_VERDICT,
  parseFeedback,
} from './feedbackInput'

const valid = {
  verdictId: 'rules',
  ruleId: 'R8',
  rubricVersion: '2.0.0',
  reason: 'needs-less',
}

function webSource(path: string): string {
  return readFileSync(
    new URL(`../../../web/src/content/lab/${path}`, import.meta.url),
    'utf8',
  )
}

function webRuleIds(): string[] {
  const block = /export const RULE_IDS = \[([\s\S]*?)\] as const/.exec(
    webSource('rubric.ts'),
  )
  if (!block?.[1]) throw new Error('RULE_IDS not found in app/web rubric.ts')
  return [...block[1].matchAll(/'(R\d+)'/g)].map((match) => match[1] ?? '')
}

function webRuleVerdict(): Record<string, string> {
  const block = /export const RULE_VERDICT\b[^=]*=\s*\{([\s\S]*?)\}/.exec(
    webSource('rules/index.ts'),
  )
  if (!block?.[1])
    throw new Error('RULE_VERDICT literal map not found in app/web rules/index.ts')
  return Object.fromEntries(
    [...block[1].matchAll(/\b(R\d+):\s*'([a-z-]+)'/g)].map((match) => [
      match[1] ?? '',
      match[2] ?? '',
    ]),
  )
}

function webRubricVersion(): string {
  const match = /export const RUBRIC_VERSION = '([^']+)'/.exec(webSource('rubric.ts'))
  if (!match?.[1]) throw new Error('RUBRIC_VERSION not found in app/web rubric.ts')
  return match[1]
}

describe('RULE_IDS', () => {
  it('matches the web rubric list', () => {
    expect([...RULE_IDS]).toEqual(webRuleIds())
  })
})

describe('RULE_VERDICT', () => {
  it('matches the web rule map', () => {
    expect({ ...RULE_VERDICT }).toEqual(webRuleVerdict())
  })
})

describe('RUBRIC_VERSIONS', () => {
  it('contains the web rubric version', () => {
    expect(RUBRIC_VERSIONS as readonly string[]).toContain(webRubricVersion())
  })
})

describe('parseFeedback', () => {
  it('fixes the enums and the byte limit', () => {
    expect(VERDICT_IDS).toEqual([
      'plain-code',
      'rules',
      'classic-ml',
      'language-model',
      'do-not-automate',
      'unclear',
    ])
    expect(FEEDBACK_REASONS).toEqual(['needs-less', 'needs-more', 'questions-missed'])
    expect(RULE_IDS).toEqual(Array.from({ length: 13 }, (_, i) => `R${String(i + 1)}`))
    expect(RUBRIC_VERSIONS).toEqual(['2.0.0'])
    expect(FEEDBACK_MAX_BYTES).toBe(512)
    expect(RULE_VERDICT).toEqual({
      R1: 'unclear',
      R2: 'do-not-automate',
      R3: 'unclear',
      R4: 'unclear',
      R5: 'language-model',
      R6: 'unclear',
      R7: 'plain-code',
      R8: 'rules',
      R9: 'unclear',
      R10: 'classic-ml',
      R11: 'do-not-automate',
      R12: 'plain-code',
      R13: 'unclear',
    })
  })

  it('accepts exactly the four enum fields', () => {
    expect(parseFeedback(valid)).toEqual(valid)
  })

  it('accepts every rule whose verdict is not unclear, paired with that verdict', () => {
    for (const ruleId of RULE_IDS) {
      const verdictId = RULE_VERDICT[ruleId]
      const raw = { ...valid, ruleId, verdictId }
      expect(parseFeedback(raw)).toEqual(verdictId === 'unclear' ? null : raw)
    }
  })

  it.each([
    [
      'an unclear verdict on its own rule',
      { ...valid, verdictId: 'unclear', ruleId: 'R1' },
    ],
    ['an unclear verdict on R13', { ...valid, verdictId: 'unclear', ruleId: 'R13' }],
    ['a verdict that R12 does not give', { ...valid, verdictId: 'rules', ruleId: 'R12' }],
    [
      'a verdict that R8 does not give',
      { ...valid, verdictId: 'plain-code', ruleId: 'R8' },
    ],
    [
      'a known verdict on an unclear rule',
      { ...valid, verdictId: 'rules', ruleId: 'R4' },
    ],
    ['null', null],
    ['an array', [valid]],
    ['a string', 'rules'],
    ['an unknown verdict', { ...valid, verdictId: 'magic' }],
    ['an unknown reason', { ...valid, reason: 'free text' }],
    ['an unknown rule', { ...valid, ruleId: 'R99' }],
    ['a numeric rule', { ...valid, ruleId: 4 }],
    ['an extra key', { ...valid, note: 'x' }],
    [
      'a missing rule',
      { verdictId: 'rules', rubricVersion: '2.0.0', reason: 'needs-less' },
    ],
    ['a missing key', { verdictId: 'rules', ruleId: 'R8', reason: 'needs-less' }],
    ['a numeric version', { ...valid, rubricVersion: 1 }],
    ['an empty version', { ...valid, rubricVersion: '' }],
    ['a version with spaces', { ...valid, rubricVersion: '1 0' }],
    ['a 33-character version', { ...valid, rubricVersion: 'a'.repeat(33) }],
    ['a hostname as version', { ...valid, rubricVersion: 'evil.example.com' }],
    ['an unlisted version', { ...valid, rubricVersion: '1.0.0' }],
    ['a version with trailing whitespace', { ...valid, rubricVersion: '2.0.0 ' }],
  ])('rejects %s', (_, raw) => {
    expect(parseFeedback(raw)).toBeNull()
  })
})
