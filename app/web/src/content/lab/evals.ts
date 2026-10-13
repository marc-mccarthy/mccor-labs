import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

export interface TraceCheck {
  name: string
  pass: boolean
  detail: string
}

export interface TraceCase {
  id: string
  kind: 'race' | 'argue'
  pass: boolean
  code: { pass: boolean; checks: TraceCheck[] }
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
  cases: TraceCase[]
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

export const TRACE_DIR = path.join(
  process.cwd(),
  process.env.LAB_EVALS_DIR ?? 'src/content/lab/evals',
)

const RUN_ID = /^[A-Za-z0-9-]{1,40}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const FILE_NAME = /^(\d{4}-\d{2}-\d{2})-([A-Za-z0-9-]{1,40})\.json$/

type Raw = Record<string, unknown>

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function bad(fileName: string, problem: string): never {
  throw new Error(`${fileName}: ${problem}`)
}

function str(fileName: string, obj: Raw, key: string): string {
  const value = obj[key]
  return typeof value === 'string' ? value : bad(fileName, `${key} must be a string`)
}

function bool(fileName: string, obj: Raw, key: string): boolean {
  const value = obj[key]
  return typeof value === 'boolean' ? value : bad(fileName, `${key} must be a boolean`)
}

function count(fileName: string, obj: Raw, key: string): number {
  const value = obj[key]
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : bad(fileName, `${key} must be a non-negative number`)
}

function record(fileName: string, value: unknown, key: string): Raw {
  return isRecord(value) ? value : bad(fileName, `${key} must be an object`)
}

function list(fileName: string, value: unknown, key: string): unknown[] {
  return Array.isArray(value)
    ? (value as unknown[])
    : bad(fileName, `${key} must be an array`)
}

function parseCheck(fileName: string, value: unknown): TraceCheck {
  const check = record(fileName, value, 'check')
  return {
    name: str(fileName, check, 'name'),
    pass: bool(fileName, check, 'pass'),
    detail: str(fileName, check, 'detail'),
  }
}

function parseJudge(fileName: string, value: unknown): TraceCase['judge'] {
  if (value === null) return null
  const judge = record(fileName, value, 'judge')
  return { pass: bool(fileName, judge, 'pass'), reason: str(fileName, judge, 'reason') }
}

function parseCase(fileName: string, value: unknown): TraceCase {
  const item = record(fileName, value, 'case')
  const kind = item.kind
  if (kind !== 'race' && kind !== 'argue')
    return bad(fileName, 'case kind must be race or argue')
  const code = record(fileName, item.code, 'code')
  return {
    id: str(fileName, item, 'id'),
    kind,
    pass: bool(fileName, item, 'pass'),
    code: {
      pass: bool(fileName, code, 'pass'),
      checks: list(fileName, code.checks, 'checks').map((c) => parseCheck(fileName, c)),
    },
    judge: parseJudge(fileName, item.judge),
    output: str(fileName, item, 'output'),
    inputTokens: count(fileName, item, 'inputTokens'),
    outputTokens: count(fileName, item, 'outputTokens'),
    guardrailTextUnits: count(fileName, item, 'guardrailTextUnits'),
    latencyMs: count(fileName, item, 'latencyMs'),
    costUsd: count(fileName, item, 'costUsd'),
  }
}

function parseTotals(fileName: string, value: unknown): EvalTrace['totals'] {
  const totals = record(fileName, value, 'totals')
  return {
    cases: count(fileName, totals, 'cases'),
    passed: count(fileName, totals, 'passed'),
    failed: count(fileName, totals, 'failed'),
    inputTokens: count(fileName, totals, 'inputTokens'),
    outputTokens: count(fileName, totals, 'outputTokens'),
    costUsd: count(fileName, totals, 'costUsd'),
  }
}

function parseRunUrl(fileName: string, value: unknown): string | null {
  if (value === null) return null
  if (typeof value !== 'string') return bad(fileName, 'runUrl must be a string or null')
  return value.startsWith('https://')
    ? value
    : bad(fileName, 'runUrl must be an https URL')
}

function parseStagedIds(fileName: string, value: unknown): string[] {
  return list(fileName, value, 'stagedCaseIds').map((id) =>
    typeof id === 'string' ? id : bad(fileName, 'stagedCaseIds must hold strings'),
  )
}

function checkFileName(fileName: string, date: string, runId: string): void {
  const match = FILE_NAME.exec(fileName)
  if (match === null) return bad(fileName, 'file name must be <date>-<runId>.json')
  if (match[1] !== date || match[2] !== runId)
    bad(fileName, 'file name does not match date and runId')
}

export function parseTrace(raw: unknown, fileName: string): EvalTrace {
  const trace = record(fileName, raw, 'trace')
  if (trace.schema !== 1) return bad(fileName, 'schema must be 1')
  const runId = str(fileName, trace, 'runId')
  const date = str(fileName, trace, 'date')
  if (!RUN_ID.test(runId)) return bad(fileName, 'runId has a bad format')
  if (!DATE.test(date)) return bad(fileName, 'date has a bad format')
  checkFileName(fileName, date, runId)
  const rubric = record(fileName, trace.rubric, 'rubric')
  return {
    schema: 1,
    runId,
    date,
    startedAt: str(fileName, trace, 'startedAt'),
    staged: bool(fileName, trace, 'staged'),
    stagedCaseIds: parseStagedIds(fileName, trace.stagedCaseIds),
    runUrl: parseRunUrl(fileName, trace.runUrl),
    modelId: str(fileName, trace, 'modelId'),
    rubricVersion: str(fileName, trace, 'rubricVersion'),
    rubric: {
      passed: count(fileName, rubric, 'passed'),
      failed: count(fileName, rubric, 'failed'),
    },
    cases: list(fileName, trace.cases, 'cases').map((c) => parseCase(fileName, c)),
    totals: parseTotals(fileName, trace.totals),
    pass: bool(fileName, trace, 'pass'),
  }
}

function readTrace(dir: string, fileName: string): EvalTrace {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(path.join(dir, fileName), 'utf8'))
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return bad(fileName, `cannot read as JSON (${reason})`)
  }
  return parseTrace(raw, fileName)
}

export function loadTraces(dir: string): EvalTrace[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readTrace(dir, name))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}
