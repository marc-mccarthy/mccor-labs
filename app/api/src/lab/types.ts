import type { VerdictId } from '../config'

export interface RaceExample {
  input: string
  expected: string
}

export interface RaceRequest {
  examples: RaceExample[]
}

export interface ArgueRequest {
  stepSummary: string
  verdict: VerdictId
}

export interface LaneResult {
  answers: string[]
  correct: number
  total: number
  ms: number
  costUsd: number
}

export interface ModelLaneResult extends LaneResult {
  inputTokens: number
  outputTokens: number
  guardrailUnits: number
}

export interface RaceResult {
  kind: 'race'
  modelLabel: string
  pricesAsOf: string
  model: ModelLaneResult
  program: LaneResult
}

export interface ArgueResult {
  kind: 'argue'
  modelLabel: string
  pricesAsOf: string
  text: string
  ms: number
  inputTokens: number
  outputTokens: number
  guardrailUnits: number
  costUsd: number
}

export type RecordedReason = 'cap' | 'off'

export type LabResponse<R> =
  | { mode: 'live'; result: R; runsLeft: number }
  | {
      mode: 'recorded'
      reason: RecordedReason
      recordedAt: string
      result: R
      runsLeft: number | null
    }
  | { mode: 'blocked'; stage: 'input' | 'output'; runsLeft: number }

export interface TracePrompt {
  system: string
  user: string
}

export interface RaceTrace {
  schema: 1
  kind: 'race'
  recordedAt: string
  modelId: string
  request: RaceRequest
  prompt: TracePrompt & { toolName: string }
  rawToolInput: unknown
  result: RaceResult
}

export interface ArgueTrace {
  schema: 1
  kind: 'argue'
  recordedAt: string
  modelId: string
  request: ArgueRequest
  prompt: TracePrompt
  result: ArgueResult
}
