export const MODEL_ID = 'us.amazon.nova-2-lite-v1:0'
export const FOUNDATION_MODEL_ID = 'amazon.nova-2-lite-v1:0'
export const MODEL_LABEL = 'Amazon Nova 2 Lite'
export const PROFILE_REGIONS = ['us-east-1', 'us-east-2', 'us-west-2'] as const
export const PRICES_AS_OF = '2026-10-09'

export const PRICES = {
  inputPer1kTokensUsd: 0.00033,
  outputPer1kTokensUsd: 0.00275,
  guardrailPer1kUnitsUsd: 0.15,
  lambdaPerGbSecondUsd: 0.0000133334,
  lambdaPerRequestUsd: 0.0000002,
} as const

export const GUARDRAIL = { charsPerUnit: 1000, worstCaseBillingMultiplier: 2 } as const
export const LAMBDA = { memoryMb: 512, timeoutS: 15 } as const
export const CAPS = { raceDaily: 50, argueDaily: 100, counterTtlDays: 7 } as const
export const KILL_FLAG = { cacheMs: 60_000 } as const
export const MAX_BODY_BYTES = 16_384
export const BUDGET_USD = 25
export const REJECTED_POSTS_USD_PER_10M = 1.8

export const RACE = {
  minExamples: 2,
  maxExamples: 5,
  maxInputChars: 500,
  maxExpectedChars: 40,
  maxOutputTokens: 300,
  worstInputTokens: 1500,
  toolName: 'submit_answers',
} as const

export const ARGUE = {
  maxSummaryChars: 300,
  maxOutputTokens: 400,
  worstInputTokens: 600,
  worstOutputChars: 1600,
} as const

export const BEDROCK_CLIENT = { maxAttempts: 2, requestTimeoutMs: 8000 } as const

export const VERDICT_IDS = [
  'plain-code',
  'rules',
  'classic-ml',
  'language-model',
  'do-not-automate',
  'unclear',
] as const

export type VerdictId = (typeof VERDICT_IDS)[number]

export const VERDICT_LABELS: Record<VerdictId, string> = {
  'plain-code': 'A simple program',
  rules: 'A checklist your team can edit',
  'classic-ml': 'A model trained on your past cases',
  'language-model': 'An AI language model',
  'do-not-automate': 'Keep a person on it',
  unclear: 'Worth a conversation',
}
