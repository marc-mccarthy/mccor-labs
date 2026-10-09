import { signedPostJson } from '@/lib/signedPost'

export type LabKind = 'race' | 'argue'

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

export type LaneState<R> =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'live'; result: R; runsLeft: number }
  | {
      status: 'recorded'
      reason: 'cap' | 'off' | 'preview'
      recordedAt: string
      result: R
      runsLeft: number | null
    }
  | { status: 'blocked'; stage: 'input' | 'output' }
  | { status: 'error'; reason: 'network' | 'server' | 'timeout' | 'validation' }

export const LAB_TIMEOUT_MS = 20_000

type ErrorReason = Extract<LaneState<never>, { status: 'error' }>['reason']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function parseLane(value: unknown): LaneResult | null {
  if (!isRecord(value)) return null
  const { answers, correct, total, ms, costUsd } = value
  if (!isStringList(answers) || !isCount(correct) || !isCount(total)) return null
  if (!isAmount(ms) || !isAmount(costUsd) || correct > total) return null
  return { answers, correct, total, ms, costUsd }
}

function parseModelLane(value: unknown): ModelLaneResult | null {
  const lane = parseLane(value)
  if (lane === null || !isRecord(value)) return null
  const { inputTokens, outputTokens, guardrailUnits } = value
  if (!isCount(inputTokens) || !isCount(outputTokens) || !isCount(guardrailUnits)) {
    return null
  }
  return { ...lane, inputTokens, outputTokens, guardrailUnits }
}

export function parseRaceResult(value: unknown): RaceResult | null {
  if (!isRecord(value) || value.kind !== 'race') return null
  const { modelLabel, pricesAsOf } = value
  if (typeof modelLabel !== 'string' || typeof pricesAsOf !== 'string') return null
  const model = parseModelLane(value.model)
  const program = parseLane(value.program)
  if (model === null || program === null) return null
  return { kind: 'race', modelLabel, pricesAsOf, model, program }
}

export function parseArgueResult(value: unknown): ArgueResult | null {
  if (!isRecord(value) || value.kind !== 'argue') return null
  const { modelLabel, pricesAsOf, text, ms, inputTokens, outputTokens } = value
  const { guardrailUnits, costUsd } = value
  if (typeof modelLabel !== 'string' || typeof pricesAsOf !== 'string') return null
  if (typeof text !== 'string' || !isAmount(ms) || !isAmount(costUsd)) return null
  if (!isCount(inputTokens) || !isCount(outputTokens) || !isCount(guardrailUnits)) {
    return null
  }
  return {
    kind: 'argue',
    modelLabel,
    pricesAsOf,
    text,
    ms,
    inputTokens,
    outputTokens,
    guardrailUnits,
    costUsd,
  }
}

function failure(reason: ErrorReason): LaneState<never> {
  return { status: 'error', reason }
}

function parseOk<R>(body: unknown, parse: (v: unknown) => R | null): LaneState<R> {
  if (!isRecord(body)) return failure('server')
  if (body.mode === 'blocked') {
    return body.stage === 'input' || body.stage === 'output'
      ? { status: 'blocked', stage: body.stage }
      : failure('server')
  }
  const result = parse(body.result)
  if (result === null) return failure('server')
  if (body.mode === 'live') {
    return isCount(body.runsLeft)
      ? { status: 'live', result, runsLeft: body.runsLeft }
      : failure('server')
  }
  if (body.mode !== 'recorded') return failure('server')
  const { reason, recordedAt, runsLeft } = body
  if ((reason !== 'cap' && reason !== 'off') || typeof recordedAt !== 'string') {
    return failure('server')
  }
  if (runsLeft !== null && !isCount(runsLeft)) return failure('server')
  return { status: 'recorded', reason, recordedAt, result, runsLeft }
}

export function toLaneState<R>(
  status: number,
  body: unknown,
  parse: (v: unknown) => R | null,
): LaneState<R> {
  if (status === 200) return parseOk(body, parse)
  if (status === 400) return failure('validation')
  return failure('server')
}

async function exchange(
  kind: LabKind,
  body: unknown,
  post: typeof signedPostJson,
): Promise<{ status: number; body: unknown }> {
  const response = await post(`/api/lab/${kind}`, body)
  const parsed: unknown = await response.json().catch(() => null)
  return { status: response.status, body: parsed }
}

export async function postLab<R>(
  kind: LabKind,
  body: unknown,
  parse: (v: unknown) => R | null,
  options: { timeoutMs?: number; post?: typeof signedPostJson } = {},
): Promise<LaneState<R>> {
  const { timeoutMs = LAB_TIMEOUT_MS, post = signedPostJson } = options
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => {
      resolve('timeout')
    }, timeoutMs)
  })
  try {
    const outcome = await Promise.race([exchange(kind, body, post), timeout])
    if (outcome === 'timeout') return failure('timeout')
    return toLaneState(outcome.status, outcome.body, parse)
  } catch {
    return failure('network')
  } finally {
    clearTimeout(timer)
  }
}
