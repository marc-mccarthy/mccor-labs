import type { ArgueCase, EvalCase, RaceCase } from './cases'
import { judgeArgue, type Judgement, type ToolCaller } from './judge'
import { scoreArgue, scoreRace, type ArgueOutput, type RaceOutput } from './score'
import { costUsd, totals, type CaseResult, type EvalTrace } from './trace'

interface PortUsage {
  inputTokens: number
  outputTokens: number
  guardrailTextUnits: number
  latencyMs: number
}

export interface ModelPort {
  race(c: RaceCase): Promise<PortUsage & { out: RaceOutput }>
  argue(c: ArgueCase): Promise<PortUsage & { out: ArgueOutput }>
  toolCall: ToolCaller
}

export interface RunInput {
  cases: EvalCase[]
  port: ModelPort
  staged: boolean
  runId: string
  now: Date
  runUrl: string | null
  modelId: string
  rubricVersion: string
  rubric: { passed: number; failed: number }
}

export function stageCases(cases: EvalCase[]): {
  cases: EvalCase[]
  stagedCaseIds: string[]
} {
  const index = cases.findIndex((c) => c.kind === 'race')
  const target = cases[index]
  const first = target?.kind === 'race' ? target.examples[0] : undefined
  if (target?.kind !== 'race' || first === undefined) {
    return { cases, stagedCaseIds: [] }
  }
  const next =
    target.labels[(target.labels.indexOf(first.expected) + 1) % target.labels.length]
  if (next === undefined) return { cases, stagedCaseIds: [] }
  const swapped: RaceCase = {
    ...target,
    examples: target.examples.map((example, i) =>
      i === 0 ? { ...example, expected: next } : example,
    ),
  }
  return {
    cases: cases.map((c, i) => (i === index ? swapped : c)),
    stagedCaseIds: [target.id],
  }
}

function raceOutputText(out: RaceOutput): string {
  return out.blocked === false ? out.answers.join(', ') : `blocked at ${out.blocked}`
}

function argueOutputText(out: ArgueOutput): string {
  return out.blocked === false ? out.text : `blocked at ${out.blocked}`
}

function caseResult(
  base: Pick<CaseResult, 'id' | 'kind' | 'code' | 'output'>,
  usage: PortUsage,
  judged: Judgement | null,
): CaseResult {
  const inputTokens = usage.inputTokens + (judged?.inputTokens ?? 0)
  const outputTokens = usage.outputTokens + (judged?.outputTokens ?? 0)
  return {
    ...base,
    pass: base.code.pass && (judged === null || judged.pass),
    judge: judged === null ? null : { pass: judged.pass, reason: judged.reason },
    inputTokens,
    outputTokens,
    guardrailTextUnits: usage.guardrailTextUnits,
    latencyMs: usage.latencyMs,
    costUsd: costUsd(inputTokens, outputTokens, usage.guardrailTextUnits),
  }
}

function raceKey(staged: EvalCase | undefined, original: RaceCase): RaceCase {
  return staged?.kind === 'race' ? staged : original
}

async function runRace(c: RaceCase, key: RaceCase, port: ModelPort): Promise<CaseResult> {
  const run = await port.race(c)
  const code = scoreRace(key, run.out)
  return caseResult(
    { id: c.id, kind: 'race', code, output: raceOutputText(run.out) },
    run,
    null,
  )
}

async function runArgue(c: ArgueCase, port: ModelPort): Promise<CaseResult> {
  const run = await port.argue(c)
  const code = scoreArgue(c, run.out)
  const judged =
    code.pass && !c.expectBlocked && run.out.blocked === false
      ? await judgeArgue(c, run.out.text, port.toolCall)
      : null
  return caseResult(
    { id: c.id, kind: 'argue', code, output: argueOutputText(run.out) },
    run,
    judged,
  )
}

export async function runEvals(input: RunInput): Promise<EvalTrace> {
  const scored = input.staged
    ? stageCases(input.cases)
    : { cases: input.cases, stagedCaseIds: [] }
  const results: CaseResult[] = []
  for (const [i, original] of input.cases.entries()) {
    results.push(
      original.kind === 'argue'
        ? await runArgue(original, input.port)
        : await runRace(original, raceKey(scored.cases[i], original), input.port),
    )
  }
  const summary = totals(results)
  return {
    schema: 1,
    runId: input.runId,
    date: input.now.toISOString().slice(0, 10),
    startedAt: input.now.toISOString(),
    staged: input.staged,
    stagedCaseIds: scored.stagedCaseIds,
    runUrl: input.runUrl,
    modelId: input.modelId,
    rubricVersion: input.rubricVersion,
    rubric: input.rubric,
    cases: results,
    totals: summary,
    pass: summary.failed === 0 && input.rubric.failed === 0,
  }
}
