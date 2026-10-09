import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm'

import { MODEL_ID } from '../../src/config'
import { parseCases } from './cases'
import { createModelPort } from './model'
import { runEvals } from './run'
import { RUN_ID, traceFileName } from './trace'

export interface CliArgs {
  runId: string
  rubricVersion: string
  rubricReport: string
  out: string
  staged: boolean
  runUrl: string | null
}

const USAGE =
  'usage: eval --run-id <id> --rubric-version <v> --rubric-report <path> --out <dir> [--staged=true|false] [--run-url <url>]'
const RUBRIC_VERSION = /^[0-9A-Za-z][0-9A-Za-z.-]{0,31}$/
const GUARDRAIL_PARAMETER = '/mccorlabs/labs/evals/guardrail'
const FLAGS = [
  'run-id',
  'rubric-version',
  'rubric-report',
  'out',
  'staged',
  'run-url',
] as const

type Flag = (typeof FLAGS)[number]

function usageError(problem?: string): never {
  throw new Error(problem === undefined ? USAGE : `${USAGE} (${problem})`)
}

function isFlag(name: string): name is Flag {
  return (FLAGS as readonly string[]).includes(name)
}

function readFlags(argv: string[]): Map<Flag, string> {
  const flags = new Map<Flag, string>()
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? ''
    if (!arg.startsWith('--')) usageError(`unexpected argument ${arg}`)
    const eq = arg.indexOf('=')
    const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq)
    if (!isFlag(name)) usageError(`unknown argument --${name}`)
    if (flags.has(name)) usageError(`--${name} given twice`)
    const value = eq === -1 ? argv[(i += 1)] : arg.slice(eq + 1)
    if (value === undefined || value === '') usageError(`--${name} needs a value`)
    flags.set(name, value)
  }
  return flags
}

function required(flags: Map<Flag, string>, name: Flag): string {
  return flags.get(name) ?? usageError(`--${name} is required`)
}

function readStaged(value: string | undefined): boolean {
  if (value === undefined || value === 'false') return false
  if (value === 'true') return true
  return usageError('--staged must be true or false')
}

export function parseArgs(argv: string[]): CliArgs {
  const flags = readFlags(argv)
  const runId = required(flags, 'run-id')
  if (!RUN_ID.test(runId)) usageError('--run-id has bad characters')
  const rubricVersion = required(flags, 'rubric-version')
  if (!RUBRIC_VERSION.test(rubricVersion)) usageError('--rubric-version has a bad format')
  return {
    runId,
    rubricVersion,
    rubricReport: required(flags, 'rubric-report'),
    out: required(flags, 'out'),
    staged: readStaged(flags.get('staged')),
    runUrl: flags.get('run-url') ?? null,
  }
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

export function readRubricReport(json: unknown): { passed: number; failed: number } {
  const report = (typeof json === 'object' && json !== null ? json : {}) as Record<
    string,
    unknown
  >
  const { numPassedTests: passed, numFailedTests: failed } = report
  if (!isCount(passed) || !isCount(failed)) {
    throw new Error('rubric report: numPassedTests and numFailedTests must be counts')
  }
  if (passed === 0) throw new Error('rubric report: no tests passed')
  return { passed, failed }
}

async function readGuardrail(): Promise<{ id: string; version: string }> {
  const out = await new SSMClient({}).send(
    new GetParameterCommand({ Name: GUARDRAIL_PARAMETER }),
  )
  const value = JSON.parse(out.Parameter?.Value ?? 'null') as unknown
  const { id, version } = (
    typeof value === 'object' && value !== null ? value : {}
  ) as Record<string, unknown>
  if (
    typeof id !== 'string' ||
    id === '' ||
    typeof version !== 'string' ||
    version === ''
  ) {
    throw new Error(`${GUARDRAIL_PARAMETER} must hold JSON with id and version`)
  }
  return { id, version }
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

export async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv)
  const now = new Date()
  const target = join(
    resolve(args.out),
    traceFileName({ date: now.toISOString().slice(0, 10), runId: args.runId }),
  )
  if (existsSync(target)) throw new Error(`refusing to overwrite ${target}`)
  const rubric = readRubricReport(readJson(args.rubricReport))
  const guardrail = await readGuardrail()
  const cases = parseCases(readJson(resolve(process.cwd(), 'evals/cases.json')))
  const trace = await runEvals({
    cases,
    port: createModelPort({ guardrail }),
    staged: args.staged,
    runId: args.runId,
    now,
    runUrl: args.runUrl,
    modelId: MODEL_ID,
    rubricVersion: args.rubricVersion,
    rubric,
  })
  writeFileSync(target, `${JSON.stringify(trace, null, 2)}\n`, { flag: 'wx' })
  process.stdout.write(
    `eval ${trace.runId}: ${String(trace.totals.passed)}/${String(trace.totals.cases)} cases, rubric ${String(rubric.passed)}/${String(rubric.passed + rubric.failed)}, ${trace.pass ? 'pass' : 'fail'}\n`,
  )
  return trace.pass ? 0 : 1
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code
    })
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
      process.exitCode = 2
    })
}
