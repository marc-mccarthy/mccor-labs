// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { assertNoClaims } from '@/test/noClaims'

import { loadTraces, parseTrace, type EvalTrace } from './evals'
import { evalsCopy } from './evalsCopy'

function trace(overrides: Partial<EvalTrace> = {}): EvalTrace {
  return {
    schema: 1,
    runId: 'run-1',
    date: '2026-10-09',
    startedAt: '2026-10-09T14:00:00.000Z',
    staged: false,
    stagedCaseIds: [],
    runUrl: 'https://github.com/example/repo/actions/runs/1',
    modelId: 'model-1',
    rubricVersion: '2.0.0',
    rubric: { passed: 10, failed: 0 },
    cases: [
      {
        id: 'race-one',
        kind: 'race',
        pass: true,
        code: {
          pass: true,
          checks: [{ name: 'accuracy', pass: true, detail: '3 of 3' }],
        },
        judge: null,
        output: 'a, b, c',
        inputTokens: 100,
        outputTokens: 20,
        guardrailTextUnits: 1,
        latencyMs: 400,
        costUsd: 0.0001,
      },
    ],
    totals: {
      cases: 1,
      passed: 1,
      failed: 0,
      inputTokens: 100,
      outputTokens: 20,
      costUsd: 0.0001,
    },
    pass: true,
    ...overrides,
  }
}

function fileFor(t: EvalTrace): string {
  return `${t.date}-${t.runId}.json`
}

let dir: string

beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), 'evals-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
  vi.unstubAllEnvs()
  vi.resetModules()
})

function write(name: string, body: string): void {
  writeFileSync(path.join(dir, name), body)
}

describe('parseTrace', () => {
  it('parses a valid trace', () => {
    const t = trace()
    expect(parseTrace(JSON.parse(JSON.stringify(t)), fileFor(t))).toEqual(t)
  })

  it('accepts a null run url and a judged case', () => {
    const t = trace({ runUrl: null })
    const judged = {
      ...t.cases[0],
      kind: 'argue',
      judge: { pass: false, reason: 'Too vague' },
    }
    const raw = { ...t, cases: [judged] }
    expect(parseTrace(raw, fileFor(t)).cases[0]?.judge).toEqual({
      pass: false,
      reason: 'Too vague',
    })
  })

  it('names the file when the date does not match the file name', () => {
    expect(() => parseTrace(trace(), '2026-10-08-run-1.json')).toThrow(
      '2026-10-08-run-1.json: file name does not match date and runId',
    )
  })

  it('names the file when the run id does not match the file name', () => {
    expect(() => parseTrace(trace(), '2026-10-09-other.json')).toThrow(
      '2026-10-09-other.json: file name does not match date and runId',
    )
  })

  it('rejects a missing staged field', () => {
    const rest: Record<string, unknown> = { ...trace() }
    delete rest.staged
    expect(() => parseTrace(rest, '2026-10-09-run-1.json')).toThrow(
      '2026-10-09-run-1.json: staged must be a boolean',
    )
  })

  it('rejects schema other than 1', () => {
    expect(() => parseTrace({ ...trace(), schema: 2 }, '2026-10-09-run-1.json')).toThrow(
      '2026-10-09-run-1.json: schema must be 1',
    )
  })

  it('rejects a run url that is not https', () => {
    expect(() =>
      parseTrace({ ...trace(), runUrl: 'javascript:alert(1)' }, '2026-10-09-run-1.json'),
    ).toThrow('runUrl must be an https URL')
  })

  it('rejects a case with a bad kind', () => {
    const t = trace()
    const raw = { ...t, cases: [{ ...t.cases[0], kind: 'other' }] }
    expect(() => parseTrace(raw, '2026-10-09-run-1.json')).toThrow(
      'case kind must be race or argue',
    )
  })

  it('rejects a non-object', () => {
    expect(() => parseTrace([], '2026-10-09-run-1.json')).toThrow(
      '2026-10-09-run-1.json: trace must be an object',
    )
  })
})

describe('loadTraces', () => {
  it('sorts newest startedAt first', () => {
    const older = trace({
      runId: 'a',
      startedAt: '2026-10-01T10:00:00.000Z',
      date: '2026-10-01',
    })
    const newer = trace({ runId: 'b', startedAt: '2026-10-09T10:00:00.000Z' })
    const middle = trace({
      runId: 'c',
      startedAt: '2026-10-05T10:00:00.000Z',
      date: '2026-10-05',
    })
    for (const t of [older, newer, middle]) write(fileFor(t), JSON.stringify(t))
    expect(loadTraces(dir).map((t) => t.runId)).toEqual(['b', 'c', 'a'])
  })

  it('ignores files that are not json', () => {
    write('.gitkeep', '')
    write('notes.txt', 'not a trace')
    const t = trace()
    write(fileFor(t), JSON.stringify(t))
    expect(loadTraces(dir)).toHaveLength(1)
  })

  it('throws with the file name when a json file does not parse', () => {
    write('2026-10-09-broken.json', '{not json')
    expect(() => loadTraces(dir)).toThrow(/^2026-10-09-broken\.json: cannot read as JSON/)
  })

  it('throws with the file name when a trace is invalid', () => {
    write('2026-10-09-run-1.json', JSON.stringify({ ...trace(), schema: 2 }))
    expect(() => loadTraces(dir)).toThrow('2026-10-09-run-1.json: schema must be 1')
  })

  it('returns an empty list for an empty directory', () => {
    mkdirSync(path.join(dir, 'sub'))
    expect(loadTraces(dir)).toEqual([])
  })
})

describe('TRACE_DIR', () => {
  it('defaults to the committed traces directory and loads', async () => {
    vi.stubEnv('LAB_EVALS_DIR', undefined)
    vi.resetModules()
    const mod = await import('./evals')
    expect(mod.TRACE_DIR.endsWith(path.join('src', 'content', 'lab', 'evals'))).toBe(true)
    expect(() => mod.loadTraces(mod.TRACE_DIR)).not.toThrow()
  })

  it('follows LAB_EVALS_DIR', async () => {
    vi.stubEnv('LAB_EVALS_DIR', 'tests/fixtures/evals')
    vi.resetModules()
    const mod = await import('./evals')
    expect(mod.TRACE_DIR).toBe(path.join(process.cwd(), 'tests/fixtures/evals'))
  })
})

describe('fixture trace', () => {
  it('parses the staged failing fixture used by the e2e build', () => {
    const fixtures = path.join(process.cwd(), 'tests/fixtures/evals')
    const [fixture, ...rest] = loadTraces(fixtures)
    expect(rest).toEqual([])
    expect(fixture).toMatchObject({
      runId: 'fixture-1',
      staged: true,
      stagedCaseIds: ['race-invoice-type'],
      pass: false,
      runUrl: null,
      totals: { cases: 20, passed: 19, failed: 1, costUsd: 0.00338 },
    })
    expect(fixture?.cases).toHaveLength(20)
    expect(fixture?.cases.filter((c) => !c.pass).map((c) => c.id)).toEqual([
      'race-invoice-type',
    ])
  })
})

describe('evalsCopy', () => {
  it('is pinned', () => {
    expect(evalsCopy).toEqual({
      title: 'Evals',
      description:
        'Every eval run of the Should This Be AI? lab prompts, failed runs included.',
      latestHeading: 'Latest Run',
      historyHeading: 'Run History',
      historyCaption: 'Every committed eval run, newest first',
      historyScrollLabel: 'Run History Table',
      methodHeading: 'How These Runs Work',
      passed: 'passed',
      failed: 'failed',
      staged: 'staged',
      empty: 'No runs yet.',
      casesPassed: '{passed} of {cases} cases passed',
      rubricTests: '{passed} of {total} rubric tests passed',
      rubricVersion: 'Rubric Version {version}',
      model: 'Model {model}',
      cost: 'Cost',
      runLog: 'Run Log',
      failedCases: 'Failed Cases',
      columns: {
        date: 'Date',
        result: 'Result',
        cases: 'Cases',
        rubric: 'Rubric',
        cost: 'Cost',
        log: 'Log',
      },
      method: [
        'Each run sends 20 invented cases to the model the lab uses. Code checks every answer first. Then the same model, acting as a judge, grades the written answers that passed the code checks.',
        'We run at most 15 times a month.',
        'Every run is shown here, failed runs included.',
        'A staged run is a real model run where we swapped one right answer on purpose, to show what a failed run looks like.',
        'Each run is a committed file that links to its run log.',
      ],
    })
  })

  it('makes no claims', () => {
    const strings = (value: unknown): string[] =>
      typeof value === 'string'
        ? [value]
        : Object.values(value as Record<string, unknown>).flatMap(strings)
    for (const text of strings(evalsCopy)) assertNoClaims(text)
  })
})
