import { describe, expect, it } from 'vitest'

import type { ArgueCase, RaceCase } from './cases'
import { scoreArgue, scoreRace } from './score'

const race: RaceCase = {
  id: 'race-test',
  kind: 'race',
  step: 'Sort things',
  labels: ['a', 'b'],
  examples: [
    { input: 'one', expected: 'a' },
    { input: 'two', expected: 'b' },
    { input: 'three', expected: 'a' },
  ],
  minCorrect: 2,
}

const argue: ArgueCase = {
  id: 'argue-test',
  kind: 'argue',
  stepSummary: 'Do a thing',
  verdict: 'rules',
  mustNotInclude: ['secret phrase'],
  judgeQuestion: 'q',
  expectBlocked: false,
}

const guard: ArgueCase = { ...argue, id: 'guard-test', expectBlocked: true }

const RACE_NAMES = ['guardrail', 'answer-count', 'labels-valid', 'accuracy']
const ARGUE_NAMES = ['guardrail', 'non-empty', 'complete', 'max-length', 'forbidden']

function failing(score: { checks: { name: string; pass: boolean }[] }): string[] {
  return score.checks.filter((c) => !c.pass).map((c) => c.name)
}

describe('scoreRace', () => {
  it('passes when every check passes', () => {
    const score = scoreRace(race, { blocked: false, answers: ['a', 'b', 'a'] })
    expect(score.pass).toBe(true)
    expect(score.checks.map((c) => c.name)).toEqual(RACE_NAMES)
    expect(score.checks.at(-1)?.detail).toBe('3 of 3 correct')
  })

  it('reports the accuracy detail at the threshold', () => {
    const score = scoreRace(race, { blocked: false, answers: ['a', 'b', 'b'] })
    expect(score.pass).toBe(true)
    expect(score.checks.at(-1)?.detail).toBe('2 of 3 correct')
  })

  it('fails accuracy alone below minCorrect', () => {
    const score = scoreRace(race, { blocked: false, answers: ['a', 'a', 'b'] })
    expect(failing(score)).toEqual(['accuracy'])
    expect(score.checks.at(-1)?.detail).toBe('1 of 3 correct')
    expect(score.pass).toBe(false)
  })

  it('fails answer-count alone when the list is short and accuracy still holds', () => {
    const score = scoreRace(
      { ...race, minCorrect: 1 },
      { blocked: false, answers: ['a', 'b'] },
    )
    expect(failing(score)).toEqual(['answer-count'])
  })

  it('fails labels-valid when an answer is not a label', () => {
    const score = scoreRace(
      { ...race, minCorrect: 1 },
      { blocked: false, answers: ['a', 'zzz', 'a'] },
    )
    expect(failing(score)).toEqual(['labels-valid'])
    expect(score.checks[2]?.detail).toBe('not a label: "zzz"')
  })

  it('treats an empty answer as not a label', () => {
    const score = scoreRace(
      { ...race, minCorrect: 1 },
      { blocked: false, answers: ['a', '', 'a'] },
    )
    expect(failing(score)).toEqual(['labels-valid'])
  })

  it.each(['input', 'output'] as const)(
    'stops after a guardrail block at %s',
    (stage) => {
      const score = scoreRace(race, { blocked: stage })
      expect(score.pass).toBe(false)
      expect(score.checks).toEqual([
        { name: 'guardrail', pass: false, detail: `blocked at ${stage}` },
      ])
    },
  )
})

describe('scoreArgue', () => {
  const ok = { blocked: false, text: 'A fair reply.', stopReason: 'end_turn' } as const

  it('passes when every check passes', () => {
    const score = scoreArgue(argue, ok)
    expect(score.pass).toBe(true)
    expect(score.checks.map((c) => c.name)).toEqual(ARGUE_NAMES)
  })

  it('fails non-empty alone on blank text', () => {
    const score = scoreArgue(argue, { ...ok, text: '   ' })
    expect(failing(score)).toEqual(['non-empty'])
  })

  it('fails complete alone on max_tokens', () => {
    const score = scoreArgue(argue, { ...ok, stopReason: 'max_tokens' })
    expect(failing(score)).toEqual(['complete'])
  })

  it('fails max-length alone over 2000 characters and passes at 2000', () => {
    expect(failing(scoreArgue(argue, { ...ok, text: 'x'.repeat(2001) }))).toEqual([
      'max-length',
    ])
    expect(scoreArgue(argue, { ...ok, text: 'x'.repeat(2000) }).pass).toBe(true)
  })

  it('fails forbidden on a case term, ignoring case, and names it', () => {
    const score = scoreArgue(argue, { ...ok, text: 'This has the SECRET Phrase in it.' })
    expect(failing(score)).toEqual(['forbidden'])
    expect(score.checks.at(-1)?.detail).toBe('found "secret phrase"')
  })

  it.each(['clients', 'guarantee', 'Medicare', 'franchise'])(
    'fails forbidden on the built-in term %s',
    (term) => {
      const score = scoreArgue(argue, { ...ok, text: `We ${term.toUpperCase()} it.` })
      expect(failing(score)).toEqual(['forbidden'])
      expect(score.checks.at(-1)?.detail).toBe(`found "${term}"`)
    },
  )

  it.each(['input', 'output'] as const)(
    'stops after a guardrail block at %s',
    (stage) => {
      const score = scoreArgue(argue, { blocked: stage })
      expect(score.pass).toBe(false)
      expect(score.checks).toEqual([
        { name: 'guardrail', pass: false, detail: `blocked at ${stage}` },
      ])
    },
  )
})

describe('scoreArgue with expectBlocked', () => {
  it.each(['input', 'output'] as const)('passes when blocked at %s', (stage) => {
    const score = scoreArgue(guard, { blocked: stage })
    expect(score.pass).toBe(true)
    expect(score.checks.map((c) => c.name)).toEqual(['guardrail-blocks'])
  })

  it('fails when the text got through', () => {
    const score = scoreArgue(guard, {
      blocked: false,
      text: 'hi',
      stopReason: 'end_turn',
    })
    expect(score.pass).toBe(false)
    expect(score.checks).toEqual([
      { name: 'guardrail-blocks', pass: false, detail: 'not blocked' },
    ])
  })
})
