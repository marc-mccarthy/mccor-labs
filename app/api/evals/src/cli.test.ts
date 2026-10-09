import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
import { mockClient } from 'aws-sdk-client-mock'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest'

import { main, parseArgs, readRubricReport } from './cli'
import { createModelPort } from './model'
import type { ModelPort } from './run'

vi.mock('./model', () => ({ createModelPort: vi.fn() }))

const ssm = mockClient(SSMClient)
const portMock = vi.mocked(createModelPort)
const usage = { inputTokens: 10, outputTokens: 5, guardrailTextUnits: 1, latencyMs: 20 }

const valid = [
  '--run-id',
  '123-1',
  '--rubric-version',
  '2.0.0',
  '--rubric-report',
  'rubric.json',
  '--out',
  'traces',
]

function passingPort(argueText = 'A calm reply.'): ModelPort {
  return {
    race: (c) =>
      Promise.resolve({
        ...usage,
        out: { blocked: false, answers: c.examples.map((e) => e.expected) },
      }),
    argue: (c) =>
      Promise.resolve({
        ...usage,
        out: c.expectBlocked
          ? { blocked: 'input' }
          : { blocked: false, text: argueText, stopReason: 'end_turn' },
      }),
    toolCall: () =>
      Promise.resolve({
        toolInput: { pass: true, reason: 'ok' },
        inputTokens: 5,
        outputTokens: 2,
        latencyMs: 10,
      }),
  }
}

describe('parseArgs', () => {
  it('reads the required flags and defaults the optional ones', () => {
    expect(parseArgs(valid)).toEqual({
      runId: '123-1',
      rubricVersion: '2.0.0',
      rubricReport: 'rubric.json',
      out: 'traces',
      staged: false,
      runUrl: null,
    })
  })

  it('reads the equals form, --staged and --run-url', () => {
    const args = parseArgs([
      ...valid,
      '--staged=true',
      '--run-url=https://github.com/o/r/actions/runs/1',
    ])
    expect(args.staged).toBe(true)
    expect(args.runUrl).toBe('https://github.com/o/r/actions/runs/1')
  })

  it('reads --staged=false as false', () => {
    expect(parseArgs([...valid, '--staged=false']).staged).toBe(false)
  })

  it('rejects a missing --run-id', () => {
    expect(() => parseArgs(valid.slice(2))).toThrow(/^usage: .*--run-id is required/)
  })

  it('rejects a bad --rubric-version', () => {
    const bad = [...valid]
    bad[3] = '../2.0'
    expect(() => parseArgs(bad)).toThrow(/^usage: .*--rubric-version/)
  })

  it('rejects a bad --staged value, unknown flags and a literal --', () => {
    expect(() => parseArgs([...valid, '--staged=yes'])).toThrow(/^usage:/)
    expect(() => parseArgs([...valid, '--other', 'x'])).toThrow(/^usage:/)
    expect(() => parseArgs(['--', ...valid])).toThrow(/^usage:/)
    expect(() => parseArgs([])).toThrow(/^usage:/)
  })

  it('rejects a repeated flag and a flag with no value', () => {
    expect(() => parseArgs([...valid, '--out', 'again'])).toThrow(/given twice/)
    expect(() => parseArgs([...valid.slice(0, -1)])).toThrow(/needs a value/)
  })
})

describe('readRubricReport', () => {
  it('reads the Vitest JSON counts', () => {
    expect(readRubricReport({ numPassedTests: 40, numFailedTests: 2 })).toEqual({
      passed: 40,
      failed: 2,
    })
  })

  it('throws on zero passed tests', () => {
    expect(() => readRubricReport({ numPassedTests: 0, numFailedTests: 0 })).toThrow(
      'no tests passed',
    )
  })

  it('throws on a missing, negative or fractional count', () => {
    expect(() => readRubricReport({ numPassedTests: 5 })).toThrow('must be counts')
    expect(() => readRubricReport({ numPassedTests: 5, numFailedTests: -1 })).toThrow()
    expect(() => readRubricReport({ numPassedTests: 1.5, numFailedTests: 0 })).toThrow()
    expect(() => readRubricReport(null)).toThrow()
  })
})

describe('main', () => {
  let dir: string
  let out: string
  let report: string
  let stdout: MockInstance<typeof process.stdout.write>

  function argv(...extra: string[]): string[] {
    return [
      '--run-id',
      '777-1',
      '--rubric-version',
      '2.0.0',
      '--rubric-report',
      report,
      '--out',
      out,
      ...extra,
    ]
  }

  function files(): string[] {
    return readdirSync(out)
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'eval-cli-'))
    out = dir
    report = join(dir, 'rubric.json')
    writeFileSync(report, JSON.stringify({ numPassedTests: 40, numFailedTests: 0 }))
    ssm.reset()
    ssm
      .on(GetParameterCommand, { Name: '/mccorlabs/labs/evals/guardrail' })
      .resolves({ Parameter: { Value: JSON.stringify({ id: 'gr-1', version: '3' }) } })
    portMock.mockReset()
    portMock.mockReturnValue(passingPort())
    stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    stdout.mockRestore()
    rmSync(dir, { recursive: true, force: true })
  })

  it('writes the trace file and returns 0 for a passing run', async () => {
    expect(await main(argv())).toBe(0)
    expect(portMock).toHaveBeenCalledWith({ guardrail: { id: 'gr-1', version: '3' } })
    const written = files().filter((f) => f.endsWith('-777-1.json'))
    expect(written).toHaveLength(1)
    expect(written[0]).toMatch(/^\d{4}-\d{2}-\d{2}-777-1\.json$/)
    const text = readFileSync(join(out, written[0] ?? ''), 'utf8')
    expect(text.endsWith('}\n')).toBe(true)
    expect(text).toContain('\n  "schema": 1,')
    const trace = JSON.parse(text) as Record<string, unknown>
    expect(trace).toMatchObject({
      schema: 1,
      runId: '777-1',
      staged: false,
      runUrl: null,
      rubricVersion: '2.0.0',
      rubric: { passed: 40, failed: 0 },
      pass: true,
    })
  })

  it('prints one summary line and no case output', async () => {
    await main(argv())
    expect(stdout).toHaveBeenCalledTimes(1)
    const line = String(stdout.mock.calls[0]?.[0])
    expect(line).toBe('eval 777-1: 20/20 cases, rubric 40/40, pass\n')
    expect(line).not.toContain('A calm reply.')
  })

  it('returns 1 for a failing trace and still writes it', async () => {
    portMock.mockReturnValue(passingPort('We guarantee results.'))
    expect(await main(argv('--staged=false'))).toBe(1)
    expect(String(stdout.mock.calls[0]?.[0])).toMatch(/, fail\n$/)
    expect(files().filter((f) => f.endsWith('-777-1.json'))).toHaveLength(1)
  })

  it('records a staged run', async () => {
    expect(
      await main(argv('--staged=true', '--run-url', 'https://example.com/run/1')),
    ).toBe(1)
    const name = files().find((f) => f.endsWith('-777-1.json')) ?? ''
    const trace = JSON.parse(readFileSync(join(out, name), 'utf8')) as {
      staged: boolean
      stagedCaseIds: string[]
      runUrl: string
    }
    expect(trace.staged).toBe(true)
    expect(trace.stagedCaseIds).toHaveLength(1)
    expect(trace.runUrl).toBe('https://example.com/run/1')
  })

  it('refuses to overwrite an existing trace and runs no model call', async () => {
    await main(argv())
    portMock.mockClear()
    await expect(main(argv())).rejects.toThrow('refusing to overwrite')
    expect(portMock).not.toHaveBeenCalled()
  })

  it('rejects when the guardrail parameter is not JSON with id and version', async () => {
    ssm.reset()
    ssm.on(GetParameterCommand).resolves({ Parameter: { Value: '{"id":"gr-1"}' } })
    await expect(main(argv())).rejects.toThrow('must hold JSON with id and version')
    expect(files()).toEqual(['rubric.json'])
  })

  it('rejects an empty rubric report before any AWS call', async () => {
    writeFileSync(report, JSON.stringify({ numPassedTests: 0, numFailedTests: 0 }))
    await expect(main(argv())).rejects.toThrow('no tests passed')
    expect(ssm.commandCalls(GetParameterCommand)).toHaveLength(0)
  })

  it('throws usage on bad arguments', async () => {
    await expect(main(['--', ...argv()])).rejects.toThrow(/^usage:/)
  })
})
