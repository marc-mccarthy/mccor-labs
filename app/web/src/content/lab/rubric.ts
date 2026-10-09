export type Answer = 'yes' | 'no' | 'not-sure' | null

export type Frequency = 'daily' | 'weekly' | 'monthly-or-less' | null

export const QUESTION_KEYS = [
  'fixedForm',
  'checklist',
  'changes',
  'costly',
  'checkable',
  'pastCases',
] as const

export type QuestionKey = (typeof QUESTION_KEYS)[number]

export type StepAnswers = Readonly<Record<QuestionKey, Answer>> & {
  readonly frequency: Frequency
}

export const VERDICTS = [
  'plain-code',
  'rules',
  'classic-ml',
  'language-model',
  'do-not-automate',
  'unclear',
] as const

export type Verdict = (typeof VERDICTS)[number]

export const RULE_IDS = [
  'R1',
  'R2',
  'R3',
  'R4',
  'R5',
  'R6',
  'R7',
  'R8',
  'R9',
  'R10',
  'R11',
  'R12',
  'R13',
] as const

export type RuleId = (typeof RULE_IDS)[number]

export interface Rule {
  readonly id: RuleId
  readonly reads: readonly QuestionKey[]
  readonly verdict: Verdict
  readonly why: string
  readonly when: (answers: StepAnswers) => boolean
  readonly humanSignOff: (answers: StepAnswers) => boolean
}

export interface RubricResult {
  readonly verdict: Verdict
  readonly humanSignOff: boolean
  readonly ruleId: RuleId
  readonly why: string
  readonly rubricVersion: string
}

export const RUBRIC_VERSION = '2.0.0'

export const EMPTY_ANSWERS: StepAnswers = {
  fixedForm: null,
  checklist: null,
  changes: null,
  costly: null,
  checkable: null,
  pastCases: null,
  frequency: null,
}

export function visibleQuestions(answers: StepAnswers): readonly QuestionKey[] {
  return QUESTION_KEYS.filter((key) => key !== 'changes' || answers.checklist === 'yes')
}
