import { RACE, ARGUE, VERDICT_IDS, type VerdictId } from '../../src/config'
import { countChars } from '../../src/lab/validate'

export interface RaceExample {
  input: string
  expected: string
}

export interface RaceCase {
  id: string
  kind: 'race'
  step: string
  labels: string[]
  examples: RaceExample[]
  minCorrect: number
}

export interface ArgueCase {
  id: string
  kind: 'argue'
  stepSummary: string
  verdict: VerdictId
  mustNotInclude: string[]
  judgeQuestion: string
  expectBlocked: boolean
}

export type EvalCase = RaceCase | ArgueCase

const ID = /^[a-z0-9-]{3,40}$/
const MAX_STEP_CHARS = 300
const MIN_LABELS = 2
const MAX_LABELS = 5

type Raw = Record<string, unknown>

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function fail(id: string, problem: string): never {
  throw new Error(`case ${id}: ${problem}`)
}

function checkExample(id: string, value: unknown, labels: string[]): RaceExample {
  if (!isRecord(value) || typeof value.input !== 'string')
    return fail(id, 'example needs input and expected')
  if (typeof value.expected !== 'string')
    return fail(id, 'example needs input and expected')
  if (countChars(value.input) > RACE.maxInputChars)
    return fail(id, `example over ${String(RACE.maxInputChars)} characters`)
  if (countChars(value.expected) > RACE.maxExpectedChars)
    return fail(id, `expected over ${String(RACE.maxExpectedChars)} characters`)
  if (!labels.includes(value.expected))
    return fail(id, `expected "${value.expected}" is not a label`)
  return { input: value.input, expected: value.expected }
}

function checkRace(id: string, raw: Raw): RaceCase {
  const { step, labels, examples, minCorrect } = raw
  if (typeof step !== 'string' || step === '' || countChars(step) > MAX_STEP_CHARS)
    return fail(id, `step needs 1 to ${String(MAX_STEP_CHARS)} characters`)
  if (!isStringArray(labels) || labels.length < MIN_LABELS || labels.length > MAX_LABELS)
    return fail(id, `${String(MIN_LABELS)} to ${String(MAX_LABELS)} labels`)
  if (
    !Array.isArray(examples) ||
    examples.length < RACE.minExamples ||
    examples.length > RACE.maxExamples
  )
    return fail(id, `${String(RACE.minExamples)} to ${String(RACE.maxExamples)} examples`)
  const checked = (examples as unknown[]).map((example) =>
    checkExample(id, example, labels),
  )
  if (
    typeof minCorrect !== 'number' ||
    !Number.isInteger(minCorrect) ||
    minCorrect < 1 ||
    minCorrect > checked.length
  )
    return fail(id, 'minCorrect out of range')
  return { id, kind: 'race', step, labels, examples: checked, minCorrect }
}

function isVerdict(value: unknown): value is VerdictId {
  return typeof value === 'string' && (VERDICT_IDS as readonly string[]).includes(value)
}

function checkArgue(id: string, raw: Raw): ArgueCase {
  const { stepSummary, verdict, mustNotInclude, judgeQuestion, expectBlocked } = raw
  if (
    typeof stepSummary !== 'string' ||
    stepSummary === '' ||
    countChars(stepSummary) > ARGUE.maxSummaryChars
  )
    return fail(id, `stepSummary needs 1 to ${String(ARGUE.maxSummaryChars)} characters`)
  if (!isVerdict(verdict)) return fail(id, 'unknown verdict')
  if (!isStringArray(mustNotInclude)) return fail(id, 'mustNotInclude must be strings')
  if (typeof judgeQuestion !== 'string' || judgeQuestion === '')
    return fail(id, 'judgeQuestion is required')
  if (typeof expectBlocked !== 'boolean')
    return fail(id, 'expectBlocked must be a boolean')
  return {
    id,
    kind: 'argue',
    stepSummary,
    verdict,
    mustNotInclude,
    judgeQuestion,
    expectBlocked,
  }
}

function checkCase(raw: unknown, seen: Set<string>): EvalCase {
  if (!isRecord(raw)) throw new Error('case ?: not an object')
  const id = typeof raw.id === 'string' ? raw.id : '?'
  if (!ID.test(id)) return fail(id, 'bad id')
  if (seen.has(id)) return fail(id, 'duplicate id')
  seen.add(id)
  if (raw.kind === 'race') return checkRace(id, raw)
  if (raw.kind === 'argue') return checkArgue(id, raw)
  return fail(id, 'unknown kind')
}

export function parseCases(raw: unknown): EvalCase[] {
  if (!Array.isArray(raw)) throw new Error('cases: not an array')
  const seen = new Set<string>()
  return (raw as unknown[]).map((item) => checkCase(item, seen))
}
