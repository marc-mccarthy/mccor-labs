import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { parseCases } from './cases'

const file: unknown = JSON.parse(
  readFileSync(new URL('../cases.json', import.meta.url), 'utf8'),
)

describe('cases.json', () => {
  it('holds 20 valid cases: 10 race, 8 argue, 2 guardrail', () => {
    const cases = parseCases(file)
    expect(cases).toHaveLength(20)
    expect(cases.filter((c) => c.kind === 'race')).toHaveLength(10)
    expect(cases.filter((c) => c.kind === 'argue' && !c.expectBlocked)).toHaveLength(8)
    expect(cases.filter((c) => c.kind === 'argue' && c.expectBlocked)).toHaveLength(2)
  })

  it('contains no personal data or client claims', () => {
    const text = JSON.stringify(file)
    expect(text).not.toMatch(
      /@|\b\d{3}[-. ]\d{3}[-. ]\d{4}\b|Medicare|franchise|clients|\d+\s+(engineers|people)/i,
    )
  })
})

describe('parseCases', () => {
  const race = {
    id: 'r-one',
    kind: 'race',
    step: 's',
    labels: ['a', 'b'],
    examples: [
      { input: 't', expected: 'a' },
      { input: 'u', expected: 'b' },
    ],
    minCorrect: 1,
  }
  const argue = {
    id: 'a-one',
    kind: 'argue',
    stepSummary: 's',
    verdict: 'rules',
    mustNotInclude: [],
    judgeQuestion: 'q',
    expectBlocked: false,
  }

  it('accepts a valid race and a valid argue case', () => {
    expect(parseCases([race, argue])).toEqual([race, argue])
  })

  it.each([
    ['duplicate ids', [race, race], 'case r-one: duplicate id'],
    [
      'an unknown label',
      [{ ...race, examples: [{ input: 't', expected: 'z' }, race.examples[1]] }],
      'case r-one: expected "z" is not a label',
    ],
    [
      'one example',
      [{ ...race, examples: [race.examples[0]] }],
      'case r-one: 2 to 5 examples',
    ],
    [
      'six examples',
      [{ ...race, examples: Array(6).fill({ input: 't', expected: 'a' }) }],
      'case r-one: 2 to 5 examples',
    ],
    [
      'a long example',
      [
        {
          ...race,
          examples: [{ input: 'x'.repeat(501), expected: 'a' }, race.examples[1]],
        },
      ],
      'case r-one: example over 500 characters',
    ],
    [
      'a long expected answer',
      [
        {
          ...race,
          labels: ['a', 'b', 'y'.repeat(41)],
          examples: [{ input: 't', expected: 'y'.repeat(41) }, race.examples[1]],
        },
      ],
      'case r-one: expected over 40 characters',
    ],
    [
      'a long step',
      [{ ...race, step: 's'.repeat(301) }],
      'case r-one: step needs 1 to 300 characters',
    ],
    ['one label', [{ ...race, labels: ['a'] }], 'case r-one: 2 to 5 labels'],
    [
      'minCorrect too high',
      [{ ...race, minCorrect: 3 }],
      'case r-one: minCorrect out of range',
    ],
    [
      'minCorrect zero',
      [{ ...race, minCorrect: 0 }],
      'case r-one: minCorrect out of range',
    ],
    ['a bad id', [{ ...race, id: 'R_1' }], 'case R_1: bad id'],
    ['an unknown kind', [{ ...race, kind: 'x' }], 'case r-one: unknown kind'],
    [
      'a long summary',
      [{ ...argue, stepSummary: 's'.repeat(301) }],
      'case a-one: stepSummary needs 1 to 300 characters',
    ],
    ['a bad verdict', [{ ...argue, verdict: 'magic' }], 'case a-one: unknown verdict'],
    ['a non-array', {}, 'cases: not an array'],
  ])('rejects %s', (_, raw, message) => {
    expect(() => parseCases(raw)).toThrow(message)
  })
})
