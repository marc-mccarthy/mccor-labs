import { describe, expect, it } from 'vitest'
import {
  EMPTY_ANSWERS,
  QUESTION_KEYS,
  RUBRIC_VERSION,
  RULE_IDS,
  VERDICTS,
  visibleQuestions,
} from './rubric'

describe('rubric vocabulary', () => {
  it('fixes the six verdict ids in the spec order', () => {
    expect(VERDICTS).toEqual([
      'plain-code',
      'rules',
      'classic-ml',
      'language-model',
      'do-not-automate',
      'unclear',
    ])
  })

  it('numbers thirteen rule ids from R1', () => {
    expect(RULE_IDS).toEqual(Array.from({ length: 13 }, (_, i) => `R${String(i + 1)}`))
  })

  it('asks the questions in the spec order, with the checklist follow-up after question 2', () => {
    expect(QUESTION_KEYS).toEqual([
      'fixedForm',
      'checklist',
      'changes',
      'costly',
      'checkable',
      'pastCases',
    ])
  })

  it('shows the checklist follow-up only when question 2 is yes', () => {
    expect(visibleQuestions(EMPTY_ANSWERS)).not.toContain('changes')
    expect(visibleQuestions({ ...EMPTY_ANSWERS, checklist: 'no' })).not.toContain(
      'changes',
    )
    expect(visibleQuestions({ ...EMPTY_ANSWERS, checklist: 'yes' })).toEqual(
      QUESTION_KEYS,
    )
  })

  it('starts every answer unanswered', () => {
    expect(Object.values(EMPTY_ANSWERS).every((value) => value === null)).toBe(true)
    expect(Object.keys(EMPTY_ANSWERS)).toEqual([...QUESTION_KEYS, 'frequency'])
  })

  it('carries a semantic rubric version', () => {
    expect(RUBRIC_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
