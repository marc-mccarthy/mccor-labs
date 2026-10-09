import { describe, expect, it, vi } from 'vitest'

import casesJson from '../cases.json'
import { parseCases, type ArgueCase, type EvalCase, type RaceCase } from './cases'
import type { ToolCaller } from './judge'
import { runEvals, stageCases, type ModelPort, type RunInput } from './run'

const raceCase: RaceCase = {
  id: 'race-one',
  kind: 'race',
  step: 'Sort messages',
  labels: ['a', 'b', 'c'],
  examples: [
    { input: 'first', expected: 'a' },
    { input: 'second', expected: 'b' },
    { input: 'third', expected: 'c' },
  ],
  minCorrect: 3,
}

const argueCase: ArgueCase = {
  id: 'argue-one',
  kind: 'argue',
  stepSummary: 'Copy files to a backup folder',
  verdict: 'plain-code',
  mustNotInclude: [],
  judgeQuestion: 'Does the reply stay on this step?',
  expectBlocked: false,
}

const blockedCase: ArgueCase = { ...argueCase, id: 'argue-blocked', expectBlocked: true }

const usage = {
  inputTokens: 100,
  outputTokens: 20,
  guardrailTextUnits: 2,
  latencyMs: 300,
}
const judgeUsage = { inputTokens: 50, outputTokens: 10, latencyMs: 100 }

function fakePort(overrides: Partial<ModelPort> = {}) {
  const toolCall = vi.fn<ToolCaller>(() =>
    Promise.resolve({ toolInput: { pass: true, reason: 'fine' }, ...judgeUsage }),
  )
  const race = vi.fn((c: RaceCase) =>
    Promise.resolve({
      ...usage,
      out: { blocked: false, answers: c.examples.map((e) => e.expected) } as const,
    }),
  )
  const argue = vi.fn(() =>
    Promise.resolve({
      ...usage,
      out: { blocked: false, text: 'A calm reply.', stopReason: 'end_turn' } as const,
    }),
  )
  const port: ModelPort = { race, argue, toolCall, ...overrides }
  return { port, race, argue, toolCall }
}

function input(overrides: Partial<RunInput>): RunInput {
  return {
    cases: [raceCase, argueCase],
    port: fakePort().port,
    staged: false,
    runId: '123-1',
    now: new Date('2026-10-09T12:34:56.000Z'),
    runUrl: 'https://github.com/example/repo/actions/runs/123',
    modelId: 'model-x',
    rubricVersion: '2.0.0',
    rubric: { passed: 40, failed: 0 },
    ...overrides,
  }
}

describe('stageCases', () => {
  it('swaps the first example of the first race case to the next label', () => {
    const staged = stageCases([argueCase, raceCase])
    const swapped = staged.cases[1] as RaceCase
    expect(staged.stagedCaseIds).toEqual(['race-one'])
    expect(swapped.examples.map((e) => e.expected)).toEqual(['b', 'b', 'c'])
    expect(staged.cases[0]).toBe(argueCase)
  })

  it('cycles from the last label back to the first', () => {
    const last: RaceCase = {
      ...raceCase,
      examples: [{ input: 'x', expected: 'c' }, ...raceCase.examples.slice(1)],
    }
    const swapped = stageCases([last]).cases[0] as RaceCase
    expect(swapped.examples[0]?.expected).toBe('a')
  })

  it('leaves the input untouched and stages nothing without a race case', () => {
    expect(stageCases([argueCase])).toEqual({ cases: [argueCase], stagedCaseIds: [] })
    expect(raceCase.examples[0]?.expected).toBe('a')
  })
})

describe('runEvals', () => {
  it('passes every case into a passing, unstaged trace', async () => {
    const trace = await runEvals(input({}))
    expect(trace.pass).toBe(true)
    expect(trace.staged).toBe(false)
    expect(trace.stagedCaseIds).toEqual([])
    expect(trace.schema).toBe(1)
    expect(trace.date).toBe('2026-10-09')
    expect(trace.startedAt).toBe('2026-10-09T12:34:56.000Z')
    expect(trace.runUrl).toBe('https://github.com/example/repo/actions/runs/123')
    expect(trace.modelId).toBe('model-x')
    expect(trace.rubricVersion).toBe('2.0.0')
    expect(trace.cases.map((c) => [c.id, c.pass])).toEqual([
      ['race-one', true],
      ['argue-one', true],
    ])
    expect(trace.totals.cases).toBe(2)
    expect(trace.totals.passed).toBe(2)
  })

  it('runs cases one at a time in file order', async () => {
    const order: string[] = []
    let open = 0
    const slow = async (id: string) => {
      open += 1
      expect(open).toBe(1)
      order.push(id)
      await Promise.resolve()
      open -= 1
    }
    const { port } = fakePort({
      race: async (c) => {
        await slow(c.id)
        return {
          ...usage,
          out: { blocked: false, answers: c.examples.map((e) => e.expected) },
        }
      },
      argue: async (c) => {
        await slow(c.id)
        return {
          ...usage,
          out: { blocked: false, text: 'ok', stopReason: 'end_turn' },
        }
      },
    })
    await runEvals(input({ cases: [argueCase, raceCase, blockedCase], port }))
    expect(order).toEqual(['argue-one', 'race-one', 'argue-blocked'])
  })

  it('fails a race case with a wrong answer and keeps every case', async () => {
    const { port } = fakePort({
      race: () =>
        Promise.resolve({ ...usage, out: { blocked: false, answers: ['a', 'a', 'c'] } }),
    })
    const trace = await runEvals(input({ port }))
    const race = trace.cases[0]
    expect(race?.pass).toBe(false)
    expect(race?.code.checks.find((c) => c.name === 'accuracy')?.pass).toBe(false)
    expect(trace.pass).toBe(false)
    expect(trace.cases).toHaveLength(2)
    expect(trace.totals.failed).toBe(1)
  })

  it('stages one case: the port gets the unchanged case and the scorer the swapped key', async () => {
    const { port, race } = fakePort()
    const trace = await runEvals(input({ staged: true, port }))
    expect(trace.staged).toBe(true)
    expect(trace.stagedCaseIds).toEqual(['race-one'])
    expect(race).toHaveBeenCalledWith(raceCase)
    expect(trace.cases[0]?.pass).toBe(false)
    expect(trace.cases[0]?.code.checks.find((c) => c.name === 'accuracy')?.detail).toBe(
      '2 of 3 correct',
    )
    expect(trace.pass).toBe(false)
    expect(raceCase.examples[0]?.expected).toBe('a')
  })

  it('never calls the judge for a case whose code check fails', async () => {
    const { port, toolCall } = fakePort({
      argue: () =>
        Promise.resolve({
          ...usage,
          out: { blocked: false, text: 'We guarantee results.', stopReason: 'end_turn' },
        }),
    })
    const trace = await runEvals(input({ cases: [argueCase], port }))
    expect(toolCall).not.toHaveBeenCalled()
    expect(trace.cases[0]?.pass).toBe(false)
    expect(trace.cases[0]?.judge).toBeNull()
  })

  it('fails an argue case when the judge says no', async () => {
    const toolCall = vi.fn<ToolCaller>(() =>
      Promise.resolve({
        toolInput: { pass: false, reason: 'Off topic.' },
        ...judgeUsage,
      }),
    )
    const { port } = fakePort({ toolCall })
    const trace = await runEvals(input({ cases: [argueCase], port }))
    expect(toolCall).toHaveBeenCalledTimes(1)
    expect(trace.cases[0]?.pass).toBe(false)
    expect(trace.cases[0]?.judge).toEqual({ pass: false, reason: 'Off topic.' })
  })

  it('passes an expectBlocked case that the port blocks, with no judge', async () => {
    const { port, toolCall } = fakePort({
      argue: () => Promise.resolve({ ...usage, out: { blocked: 'input' } }),
    })
    const trace = await runEvals(input({ cases: [blockedCase], port }))
    expect(trace.cases[0]?.pass).toBe(true)
    expect(trace.cases[0]?.judge).toBeNull()
    expect(trace.cases[0]?.output).toBe('blocked at input')
    expect(toolCall).not.toHaveBeenCalled()
  })

  it('counts judge tokens and cost into the case', async () => {
    const trace = await runEvals(input({ cases: [argueCase] }))
    const result = trace.cases[0]
    expect(result?.judge).toEqual({ pass: true, reason: 'fine' })
    expect(result?.inputTokens).toBe(150)
    expect(result?.outputTokens).toBe(30)
    expect(result?.guardrailTextUnits).toBe(2)
    expect(result?.latencyMs).toBe(300)
    expect(result?.costUsd).toBeGreaterThan(0)
    expect(trace.totals.inputTokens).toBe(150)
  })

  it('rejects when the port rejects', async () => {
    const { port } = fakePort({
      race: () => Promise.reject(new Error('ThrottlingException')),
    })
    await expect(runEvals(input({ port }))).rejects.toThrow('ThrottlingException')
  })

  it('fails the trace when the rubric run has failures', async () => {
    const trace = await runEvals(input({ rubric: { passed: 39, failed: 1 } }))
    expect(trace.totals.failed).toBe(0)
    expect(trace.rubric).toEqual({ passed: 39, failed: 1 })
    expect(trace.pass).toBe(false)
  })
})

describe('shipped cases', () => {
  it('stages a failure: the first race case needs every answer right', () => {
    const cases: EvalCase[] = parseCases(casesJson)
    const first = cases.find((c): c is RaceCase => c.kind === 'race')
    expect(first?.minCorrect).toBe(first?.examples.length)
  })
})
