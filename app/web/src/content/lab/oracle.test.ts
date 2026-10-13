import { describe, expect, it } from 'vitest'
import {
  EMPTY_ANSWERS,
  QUESTION_KEYS,
  classifyStep,
  type Answer,
  type StepAnswers,
  type Verdict,
} from './rubric'

const VALUES: readonly Answer[] = ['yes', 'no', 'not-sure', null]

function isKnown(answer: Answer): boolean {
  return answer === 'yes' || answer === 'no'
}

function everyAnswerSet(): StepAnswers[] {
  return QUESTION_KEYS.reduce<StepAnswers[]>(
    (sets, key) =>
      sets.flatMap((set) => VALUES.map((value) => ({ ...set, [key]: value }))),
    [EMPTY_ANSWERS],
  )
}

function decide(answers: StepAnswers): { verdict: Verdict; humanSignOff: boolean } {
  const unclear = { verdict: 'unclear' as const, humanSignOff: false }
  if (!isKnown(answers.costly)) return unclear
  if (answers.costly === 'yes' && !isKnown(answers.checkable)) return unclear
  if (!isKnown(answers.fixedForm)) return unclear
  if (answers.fixedForm === 'yes' && !isKnown(answers.checklist)) return unclear

  const unchecked = answers.costly === 'yes' && answers.checkable === 'no'
  if (unchecked) {
    const fixedChecklist = answers.fixedForm === 'yes' && answers.checklist === 'yes'
    return {
      verdict: fixedChecklist ? 'plain-code' : 'do-not-automate',
      humanSignOff: false,
    }
  }

  const humanSignOff = answers.costly === 'yes' && answers.checkable === 'yes'
  if (answers.fixedForm === 'no') return { verdict: 'language-model', humanSignOff }
  if (answers.checklist === 'yes') {
    if (answers.changes === 'no') return { verdict: 'plain-code', humanSignOff }
    if (answers.changes === 'yes') return { verdict: 'rules', humanSignOff }
    return unclear
  }
  if (answers.pastCases === 'yes') return { verdict: 'classic-ml', humanSignOff }
  if (answers.pastCases === 'no')
    return { verdict: 'do-not-automate', humanSignOff: false }
  return unclear
}

describe('classifyStep against an independent decision function', () => {
  it('agrees on verdict and sign-off for all 4,096 answer sets', () => {
    const sets = everyAnswerSet()
    expect(sets).toHaveLength(4096)
    for (const answers of sets) {
      const result = classifyStep(answers)
      const expected = decide(answers)
      expect(
        { verdict: result.verdict, humanSignOff: result.humanSignOff },
        JSON.stringify(answers),
      ).toEqual(expected)
    }
  })
})
