import { guardrailCostUsd, modelCostUsd } from '../../src/lab/cost'
import type { CodeScore } from './score'

export interface CaseResult {
  id: string
  kind: 'race' | 'argue'
  pass: boolean
  code: CodeScore
  judge: { pass: boolean; reason: string } | null
  output: string
  inputTokens: number
  outputTokens: number
  guardrailTextUnits: number
  latencyMs: number
  costUsd: number
}

export interface EvalTrace {
  schema: 1
  runId: string
  date: string
  startedAt: string
  staged: boolean
  stagedCaseIds: string[]
  runUrl: string | null
  modelId: string
  rubricVersion: string
  rubric: { passed: number; failed: number }
  cases: CaseResult[]
  totals: {
    cases: number
    passed: number
    failed: number
    inputTokens: number
    outputTokens: number
    costUsd: number
  }
  pass: boolean
}

export const RUN_ID = /^[A-Za-z0-9-]{1,40}$/

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const COST_DECIMALS = 8

function roundUsd(value: number): number {
  const scale = 10 ** COST_DECIMALS
  return Math.round(value * scale) / scale
}

export function costUsd(
  inputTokens: number,
  outputTokens: number,
  guardrailUnits: number,
): number {
  return roundUsd(
    modelCostUsd({ inputTokens, outputTokens }) + guardrailCostUsd(guardrailUnits),
  )
}

function sum(cases: CaseResult[], pick: (c: CaseResult) => number): number {
  return cases.reduce((total, c) => total + pick(c), 0)
}

export function totals(cases: CaseResult[]): EvalTrace['totals'] {
  const passed = cases.filter((c) => c.pass).length
  return {
    cases: cases.length,
    passed,
    failed: cases.length - passed,
    inputTokens: sum(cases, (c) => c.inputTokens),
    outputTokens: sum(cases, (c) => c.outputTokens),
    costUsd: roundUsd(sum(cases, (c) => c.costUsd)),
  }
}

function isRealDate(date: string): boolean {
  const match = DATE.exec(date)
  if (match === null) return false
  const [year, month, day] = match.slice(1).map(Number)
  const parsed = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0))
  return parsed.toISOString().slice(0, 10) === date
}

export function traceFileName(t: Pick<EvalTrace, 'date' | 'runId'>): string {
  if (!isRealDate(t.date)) throw new Error(`bad trace date: ${t.date}`)
  if (!RUN_ID.test(t.runId)) throw new Error(`bad run id: ${t.runId}`)
  return `${t.date}-${t.runId}.json`
}
