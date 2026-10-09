import { describe, expect, it } from 'vitest'
import { EMPTY_ANSWERS, type Answer, type StepAnswers } from '../rubric'
import { R1 } from './R1'
import { R2 } from './R2'
import { R3 } from './R3'
import { R4 } from './R4'
import { R6 } from './R6'
import { R7 } from './R7'
import { R8 } from './R8'
import { R12 } from './R12'
import { R13 } from './R13'

const UNKNOWN: readonly Answer[] = [null, 'not-sure']
const SAFE: readonly Partial<StepAnswers>[] = [
  { costly: 'no' },
  { costly: 'yes', checkable: 'yes' },
]
const UNCHECKED: Partial<StepAnswers> = { costly: 'yes', checkable: 'no' }
const KNOWN_GATES: readonly Partial<StepAnswers>[] = [...SAFE, UNCHECKED]
const UNKNOWN_GATES: readonly Partial<StepAnswers>[] = [
  { costly: null },
  { costly: 'not-sure' },
  { costly: 'yes', checkable: null },
  { costly: 'yes', checkable: 'not-sure' },
]

function given(partial: Partial<StepAnswers>): StepAnswers {
  return { ...EMPTY_ANSWERS, ...partial }
}

describe('R1: the cost of a mistake is unknown', () => {
  it.each(UNKNOWN)('fires when costly is %s', (costly) => {
    expect(R1.when(given({ costly }))).toBe(true)
  })
  it.each(['yes', 'no'] as const)('stays silent when costly is %s', (costly) => {
    expect(R1.when(given({ costly }))).toBe(false)
  })
  it('says unclear with no sign-off', () => {
    expect(R1.verdict).toBe('unclear')
    expect(R1.humanSignOff(given({}))).toBe(false)
  })
})

describe('R3: costly and the check is unknown', () => {
  it.each(UNKNOWN)('fires when checkable is %s', (checkable) => {
    expect(R3.when(given({ costly: 'yes', checkable }))).toBe(true)
  })
  it.each(['yes', 'no'] as const)('stays silent when checkable is %s', (checkable) => {
    expect(R3.when(given({ costly: 'yes', checkable }))).toBe(false)
  })
  it('stays silent when a mistake is cheap', () => {
    expect(R3.when(given({ costly: 'no', checkable: null }))).toBe(false)
  })
  it('says unclear', () => {
    expect(R3.verdict).toBe('unclear')
  })
})

describe('R4: the form is unknown once the cost gates are known', () => {
  it.each(
    KNOWN_GATES.flatMap((gate) => UNKNOWN.map((fixedForm) => ({ ...gate, fixedForm }))),
  )('fires for %o', (partial) => {
    expect(R4.when(given(partial))).toBe(true)
  })
  it.each(UNKNOWN_GATES)('stays silent while a cost gate is unknown: %o', (partial) => {
    expect(R4.when(given({ ...partial, fixedForm: null }))).toBe(false)
  })
  it.each(['yes', 'no'] as const)('stays silent when fixedForm is %s', (fixedForm) => {
    expect(R4.when(given({ costly: 'no', fixedForm }))).toBe(false)
  })
  it('says unclear', () => {
    expect(R4.verdict).toBe('unclear')
  })
})

describe('R2: costly, unchecked, and not a fixed checklist', () => {
  it.each([
    { fixedForm: 'no', checklist: null },
    { fixedForm: 'no', checklist: 'yes' },
    { fixedForm: 'yes', checklist: 'no' },
  ] as const)('fires for %o', (partial) => {
    expect(R2.when(given({ ...UNCHECKED, ...partial }))).toBe(true)
  })
  it.each([
    { fixedForm: 'yes', checklist: 'yes' },
    { fixedForm: 'yes', checklist: null },
    { fixedForm: null, checklist: 'no' },
  ] as const)('stays silent for %o', (partial) => {
    expect(R2.when(given({ ...UNCHECKED, ...partial }))).toBe(false)
  })
  it.each(SAFE)('stays silent when the step is safe: %o', (partial) => {
    expect(R2.when(given({ ...partial, fixedForm: 'no' }))).toBe(false)
  })
  it('keeps a person on it with no sign-off', () => {
    expect(R2.verdict).toBe('do-not-automate')
    expect(R2.humanSignOff(given({ ...UNCHECKED, fixedForm: 'no' }))).toBe(false)
  })
})

describe('R6: fixed form, checklist unknown', () => {
  it.each(
    KNOWN_GATES.flatMap((gate) => UNKNOWN.map((checklist) => ({ ...gate, checklist }))),
  )('fires for %o', (partial) => {
    expect(R6.when(given({ ...partial, fixedForm: 'yes' }))).toBe(true)
  })
  it.each(['yes', 'no'] as const)('stays silent when checklist is %s', (checklist) => {
    expect(R6.when(given({ costly: 'no', fixedForm: 'yes', checklist }))).toBe(false)
  })
  it.each(UNKNOWN_GATES)('stays silent while a cost gate is unknown: %o', (partial) => {
    expect(R6.when(given({ ...partial, fixedForm: 'yes' }))).toBe(false)
  })
  it('stays silent on free text', () => {
    expect(R6.when(given({ costly: 'no', fixedForm: 'no' }))).toBe(false)
  })
})

describe('R12: costly and unchecked, but a fixed-form checklist', () => {
  it('fires on the exact combination, whatever the follow-up says', () => {
    for (const changes of ['yes', 'no', 'not-sure', null] as const) {
      expect(
        R12.when(given({ ...UNCHECKED, fixedForm: 'yes', checklist: 'yes', changes })),
      ).toBe(true)
    }
  })
  it.each(SAFE)('stays silent when the step is safe: %o', (partial) => {
    expect(R12.when(given({ ...partial, fixedForm: 'yes', checklist: 'yes' }))).toBe(
      false,
    )
  })
  it('says a simple program with no sign-off and tells the visitor to test it', () => {
    expect(R12.verdict).toBe('plain-code')
    expect(
      R12.humanSignOff(given({ ...UNCHECKED, fixedForm: 'yes', checklist: 'yes' })),
    ).toBe(false)
    expect(R12.why).toMatch(/past cases/)
  })
})

const CHECKLIST = { fixedForm: 'yes', checklist: 'yes' } as const

describe('R7, R8 and R13: a safe fixed-form checklist', () => {
  it.each(SAFE)('R7 fires when the team rarely changes it: %o', (partial) => {
    expect(R7.when(given({ ...partial, ...CHECKLIST, changes: 'no' }))).toBe(true)
    expect(R7.verdict).toBe('plain-code')
  })
  it.each(SAFE)('R8 fires when the team changes it often: %o', (partial) => {
    expect(R8.when(given({ ...partial, ...CHECKLIST, changes: 'yes' }))).toBe(true)
    expect(R8.verdict).toBe('rules')
  })
  it.each(UNKNOWN)('R13 fires when changes is %s', (changes) => {
    expect(R13.when(given({ costly: 'no', ...CHECKLIST, changes }))).toBe(true)
    expect(R13.verdict).toBe('unclear')
  })
  it('signs off only when a mistake is costly and checked first', () => {
    for (const [rule, changes] of [
      [R7, 'no'],
      [R8, 'yes'],
    ] as const) {
      expect(rule.humanSignOff(given({ costly: 'no', ...CHECKLIST, changes }))).toBe(
        false,
      )
      expect(
        rule.humanSignOff(
          given({ costly: 'yes', checkable: 'yes', ...CHECKLIST, changes }),
        ),
      ).toBe(true)
    }
    expect(
      R13.humanSignOff(given({ costly: 'yes', checkable: 'yes', ...CHECKLIST })),
    ).toBe(false)
  })
  it.each([UNCHECKED, ...UNKNOWN_GATES])(
    'all three stay silent unless the step is safe: %o',
    (partial) => {
      for (const changes of ['yes', 'no', null] as const) {
        for (const rule of [R7, R8, R13]) {
          expect(rule.when(given({ ...partial, ...CHECKLIST, changes }))).toBe(false)
        }
      }
    },
  )
  it('all three stay silent without a fixed-form checklist', () => {
    for (const rule of [R7, R8, R13]) {
      expect(
        rule.when(
          given({ costly: 'no', fixedForm: 'no', checklist: 'yes', changes: 'no' }),
        ),
      ).toBe(false)
      expect(
        rule.when(
          given({ costly: 'no', fixedForm: 'yes', checklist: 'no', changes: 'no' }),
        ),
      ).toBe(false)
    }
  })
})
