import { describe, expect, it } from 'vitest'
import {
  EMPTY_ANSWERS,
  QUESTION_KEYS,
  RUBRIC_VERSION,
  RULE_IDS,
  VERDICTS,
  classifyStep,
  getRule,
  visibleQuestions,
  type Answer,
  type StepAnswers,
} from './rubric'
import { RULES } from './rules'

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

const VALUES: readonly Answer[] = ['yes', 'no', 'not-sure', null]

function everyAnswerSet(): StepAnswers[] {
  return QUESTION_KEYS.reduce<StepAnswers[]>(
    (sets, key) =>
      sets.flatMap((set) => VALUES.map((value) => ({ ...set, [key]: value }))),
    [EMPTY_ANSWERS],
  )
}

const ALL = everyAnswerSet()

describe('classifyStep', () => {
  it('covers all 4,096 answer sets', () => {
    expect(ALL).toHaveLength(4096)
  })

  it('matches exactly one rule for every answer set', () => {
    for (const answers of ALL) {
      const matching = RULES.filter((rule) => rule.when(answers)).map((rule) => rule.id)
      expect(matching, JSON.stringify(answers)).toHaveLength(1)
    }
  })

  it('returns the matching rule, its reason and the rubric version', () => {
    for (const answers of ALL) {
      const result = classifyStep(answers)
      const rule = getRule(result.ruleId)
      expect(rule.when(answers)).toBe(true)
      expect(result.verdict).toBe(rule.verdict)
      expect(result.why).toBe(rule.why)
      expect(result.rubricVersion).toBe(RUBRIC_VERSION)
    }
  })

  it('gives unclear only when an answer the matching rule reads is missing or not sure', () => {
    for (const answers of ALL) {
      const result = classifyStep(answers)
      if (result.verdict !== 'unclear') continue
      const known = getRule(result.ruleId).reads.every(
        (key) => answers[key] === 'yes' || answers[key] === 'no',
      )
      expect(known, JSON.stringify(answers)).toBe(false)
    }
  })

  it('never changes a firm verdict when a missing or not-sure answer is filled in', () => {
    for (const answers of ALL) {
      const result = classifyStep(answers)
      if (result.verdict === 'unclear') continue
      const open = QUESTION_KEYS.filter(
        (key) => answers[key] !== 'yes' && answers[key] !== 'no',
      )
      for (const key of open) {
        for (const value of ['yes', 'no'] as const) {
          expect(
            classifyStep({ ...answers, [key]: value }).verdict,
            JSON.stringify({ answers, key, value }),
          ).toBe(result.verdict)
        }
      }
    }
  })

  it('keeps a person on a costly unchecked step unless it is a fixed-form checklist', () => {
    for (const answers of ALL.filter((a) => a.costly === 'yes' && a.checkable === 'no')) {
      const result = classifyStep(answers)
      const fixedChecklist = answers.fixedForm === 'yes' && answers.checklist === 'yes'
      const notChecklist =
        answers.fixedForm === 'no' ||
        (answers.fixedForm === 'yes' && answers.checklist === 'no')
      if (fixedChecklist) {
        expect(result.ruleId, JSON.stringify(answers)).toBe('R12')
      } else if (notChecklist) {
        expect(result.verdict, JSON.stringify(answers)).toBe('do-not-automate')
      } else {
        expect(result.verdict, JSON.stringify(answers)).toBe('unclear')
      }
    }
  })

  it('adds sign-off exactly when the verdict is a tool and a costly mistake is checked first', () => {
    for (const answers of ALL) {
      const result = classifyStep(answers)
      const tool = result.verdict !== 'do-not-automate' && result.verdict !== 'unclear'
      expect(result.humanSignOff, JSON.stringify(answers)).toBe(
        tool && answers.costly === 'yes' && answers.checkable === 'yes',
      )
    }
  })

  it('ignores how often the step happens', () => {
    for (const frequency of ['daily', 'weekly', 'monthly-or-less', null] as const) {
      expect(
        classifyStep({ ...EMPTY_ANSWERS, costly: 'no', fixedForm: 'no', frequency })
          .ruleId,
      ).toBe('R5')
    }
  })

  it.each(RULES)('$id reads exactly the answers its condition uses', (rule) => {
    const source = rule.when.toString()
    const used = QUESTION_KEYS.filter((key) => source.includes(`.${key}`))
    expect(new Set(rule.reads)).toEqual(new Set(used))
  })

  it('throws for an unknown rule id', () => {
    expect(() => getRule('R99' as never)).toThrow(/R99/)
  })
})

describe('classifyStep on worked examples', () => {
  it.each([
    {
      example: 'read supplier invoice PDFs before payment',
      answers: { fixedForm: 'no', costly: 'yes', checkable: 'yes' },
      ruleId: 'R5',
      verdict: 'language-model',
      humanSignOff: true,
    },
    {
      example: 'sort incoming support emails by topic',
      answers: { fixedForm: 'no', costly: 'no' },
      ruleId: 'R5',
      verdict: 'language-model',
      humanSignOff: false,
    },
    {
      example: 'quote a job from the rate card with no check before it is sent',
      answers: {
        fixedForm: 'yes',
        checklist: 'yes',
        changes: 'no',
        costly: 'yes',
        checkable: 'no',
      },
      ruleId: 'R12',
      verdict: 'plain-code',
      humanSignOff: false,
    },
    {
      example: 'auto-approve refunds under a set limit with no check',
      answers: {
        fixedForm: 'yes',
        checklist: 'yes',
        changes: 'yes',
        costly: 'yes',
        checkable: 'no',
      },
      ruleId: 'R12',
      verdict: 'plain-code',
      humanSignOff: false,
    },
    {
      example: 'pick a shipping rate from a table the team edits monthly',
      answers: { fixedForm: 'yes', checklist: 'yes', changes: 'yes', costly: 'no' },
      ruleId: 'R8',
      verdict: 'rules',
      humanSignOff: false,
    },
    {
      example:
        'write the monthly report from a spreadsheet: the input is a spreadsheet but the result is written paragraphs, so fixedForm is no',
      answers: {
        fixedForm: 'no',
        checklist: 'no',
        costly: 'yes',
        checkable: 'yes',
        pastCases: 'yes',
        frequency: 'monthly-or-less',
      },
      ruleId: 'R5',
      verdict: 'language-model',
      humanSignOff: true,
    },
    {
      example: 'screen job applicant CVs for a shortlist',
      answers: { fixedForm: 'no', costly: 'yes', checkable: 'yes' },
      ruleId: 'R5',
      verdict: 'language-model',
      humanSignOff: true,
    },
  ] as const)('$example gives $verdict', ({ answers, ruleId, verdict, humanSignOff }) => {
    const result = classifyStep({ ...EMPTY_ANSWERS, ...answers })
    expect(result.ruleId).toBe(ruleId)
    expect(result.verdict).toBe(verdict)
    expect(result.humanSignOff).toBe(humanSignOff)
  })
})
