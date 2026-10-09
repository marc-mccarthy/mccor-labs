import { describe, expect, it } from 'vitest'

import type { ArgueCase } from './cases'
import { JUDGE_TOOL, judgeArgue, type ToolCallRequest, type ToolCaller } from './judge'

const argueCase: ArgueCase = {
  id: 'argue-test',
  kind: 'argue',
  stepSummary: 'Copy files to a backup folder',
  verdict: 'plain-code',
  mustNotInclude: [],
  judgeQuestion: 'Does the reply stay on this step?',
  expectBlocked: false,
}

const reply = 'Line one.\nLine two with "quotes" and Reply: inside.'

function fake(toolInput: unknown) {
  const seen: ToolCallRequest[] = []
  const call: ToolCaller = (req) => {
    seen.push(req)
    return Promise.resolve({
      toolInput,
      inputTokens: 120,
      outputTokens: 30,
      latencyMs: 410,
    })
  }
  return { call, seen }
}

describe('judgeArgue', () => {
  it('sends the four labelled blocks in order with the reply verbatim', async () => {
    const { call, seen } = fake({ pass: true, reason: 'ok' })
    await judgeArgue(argueCase, reply, call)
    const req = seen[0]
    expect(req?.user).toBe(
      [
        'Step: Copy files to a backup folder',
        'Verdict: A simple program',
        'Question: Does the reply stay on this step?',
        `Reply: ${reply}`,
      ].join('\n'),
    )
    expect(req?.system).toContain('grade')
    expect(req?.system).toContain('rubric verdict')
  })

  it('forces the grade tool at temperature 0 with 200 tokens', async () => {
    const { call, seen } = fake({ pass: true, reason: 'ok' })
    await judgeArgue(argueCase, reply, call)
    expect(seen[0]).toMatchObject({
      toolName: 'grade',
      toolSchema: JUDGE_TOOL.schema,
      maxTokens: 200,
      temperature: 0,
    })
    expect(JUDGE_TOOL.schema).toEqual({
      type: 'object',
      properties: {
        pass: { type: 'boolean' },
        reason: { type: 'string', maxLength: 200 },
      },
      required: ['pass', 'reason'],
    })
  })

  it('maps a valid grade through with the usage numbers', async () => {
    const { call } = fake({ pass: false, reason: 'drifts off topic' })
    await expect(judgeArgue(argueCase, reply, call)).resolves.toEqual({
      pass: false,
      reason: 'drifts off topic',
      inputTokens: 120,
      outputTokens: 30,
      latencyMs: 410,
    })
  })

  it.each([
    ['null', null],
    ['a string', 'pass'],
    ['an array', [true, 'x']],
    ['a missing reason', { pass: true }],
    ['a string pass', { pass: 'true', reason: 'x' }],
    ['a numeric reason', { pass: true, reason: 3 }],
  ])('turns %s into the fixed failure and keeps the tokens', async (_, input) => {
    const { call } = fake(input)
    await expect(judgeArgue(argueCase, reply, call)).resolves.toEqual({
      pass: false,
      reason: 'judge returned an invalid grade',
      inputTokens: 120,
      outputTokens: 30,
      latencyMs: 410,
    })
  })

  it('cuts a reason over 200 characters to 200', async () => {
    const { call } = fake({ pass: true, reason: 'x'.repeat(250) })
    const out = await judgeArgue(argueCase, reply, call)
    expect(out.reason).toBe('x'.repeat(200))
  })

  it('propagates a rejected caller', async () => {
    const call: ToolCaller = () => Promise.reject(new Error('throttled'))
    await expect(judgeArgue(argueCase, reply, call)).rejects.toThrow('throttled')
  })
})
