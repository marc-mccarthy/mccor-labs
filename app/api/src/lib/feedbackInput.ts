import { VERDICT_IDS, type VerdictId } from '../config'

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
export const FEEDBACK_REASONS = ['needs-less', 'needs-more', 'questions-missed'] as const
export const RUBRIC_VERSIONS = ['2.0.0'] as const
export const FEEDBACK_MAX_BYTES = 512

export type RuleId = (typeof RULE_IDS)[number]
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number]

export const RULE_VERDICT: Readonly<Record<RuleId, VerdictId>> = {
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
}

export interface Feedback {
  verdictId: VerdictId
  ruleId: RuleId
  rubricVersion: string
  reason: FeedbackReason
}

const KEYS = 'reason,rubricVersion,ruleId,verdictId'

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value)
}

export function parseFeedback(raw: unknown): Feedback | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  if (Object.keys(record).sort().join(',') !== KEYS) return null
  const { verdictId, ruleId, rubricVersion, reason } = record
  if (!isOneOf(VERDICT_IDS, verdictId) || !isOneOf(FEEDBACK_REASONS, reason)) return null
  if (!isOneOf(RULE_IDS, ruleId)) return null
  if (verdictId === 'unclear' || RULE_VERDICT[ruleId] !== verdictId) return null
  if (!isOneOf(RUBRIC_VERSIONS, rubricVersion)) return null
  return { verdictId, ruleId, rubricVersion, reason }
}
