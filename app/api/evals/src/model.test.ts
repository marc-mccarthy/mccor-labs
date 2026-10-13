import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { argueModel } from '../../src/lab/argue'
import { checkText } from '../../src/lab/guardrail'
import { raceModel } from '../../src/lab/race'
import type { ArgueCase, RaceCase } from './cases'
import { createModelPort } from './model'

vi.mock('../../src/lab/race', () => ({ raceModel: vi.fn() }))
vi.mock('../../src/lab/argue', () => ({ argueModel: vi.fn() }))
vi.mock('../../src/lab/guardrail', () => ({ checkText: vi.fn() }))

const bedrock = mockClient(BedrockRuntimeClient)
const guardrail = { id: 'gr-1', version: '3' }
const port = createModelPort({ guardrail })

const raceCase: RaceCase = {
  id: 'race-one',
  kind: 'race',
  step: 'Sort messages',
  labels: ['a', 'b'],
  examples: [
    { input: 'first text', expected: 'a' },
    { input: 'second text', expected: 'b' },
  ],
  minCorrect: 2,
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

const raceMock = vi.mocked(raceModel)
const argueMock = vi.mocked(argueModel)
const checkMock = vi.mocked(checkText)

function raceRun(answers: string[]) {
  return {
    answers,
    rawToolInput: null,
    stopReason: 'tool_use' as const,
    inputTokens: 90,
    outputTokens: 12,
    ms: 40,
    prompt: { system: 's', user: 'u', toolName: 'submit_answers' as const },
  }
}

function argueRun(text: string, outputTokens = 80) {
  return {
    text,
    inputTokens: 70,
    outputTokens,
    ms: 40,
    prompt: { system: 's', user: 'u' },
  }
}

beforeEach(() => {
  bedrock.reset()
  raceMock.mockReset()
  argueMock.mockReset()
  checkMock.mockReset()
})

describe('race', () => {
  it('sends the examples to raceModel and the guardrail text in the handler shape', async () => {
    checkMock.mockResolvedValue({ blocked: false, units: 1 })
    raceMock.mockResolvedValue(raceRun(['a', '']))
    const result = await port.race(raceCase)
    expect(raceMock).toHaveBeenCalledWith(
      expect.anything(),
      [
        { input: 'first text', expected: 'a' },
        { input: 'second text', expected: 'b' },
      ],
      expect.any(Function),
    )
    expect(checkMock.mock.calls.map(([, req]) => req)).toEqual([
      {
        id: 'gr-1',
        version: '3',
        source: 'INPUT',
        text: 'first text\na\nsecond text\nb',
      },
      { id: 'gr-1', version: '3', source: 'OUTPUT', text: 'a\n-' },
    ])
    expect(result.out).toEqual({ blocked: false, answers: ['a', ''] })
    expect(result.inputTokens).toBe(90)
    expect(result.outputTokens).toBe(12)
    expect(result.guardrailTextUnits).toBe(2)
  })

  it('maps an input block to blocked input and never calls the model', async () => {
    checkMock.mockResolvedValue({ blocked: true, units: 3 })
    const result = await port.race(raceCase)
    expect(result.out).toEqual({ blocked: 'input' })
    expect(raceMock).not.toHaveBeenCalled()
    expect(result.guardrailTextUnits).toBe(3)
    expect(result.inputTokens).toBe(0)
  })

  it('maps an output block to blocked output and keeps the billed usage', async () => {
    checkMock
      .mockResolvedValueOnce({ blocked: false, units: 2 })
      .mockResolvedValueOnce({ blocked: true, units: 5 })
    raceMock.mockResolvedValue(raceRun(['a', 'b']))
    const result = await port.race(raceCase)
    expect(result.out).toEqual({ blocked: 'output' })
    expect(result.guardrailTextUnits).toBe(7)
    expect(result.inputTokens).toBe(90)
    expect(result.outputTokens).toBe(12)
  })

  it('propagates a model rejection', async () => {
    checkMock.mockResolvedValue({ blocked: false, units: 1 })
    raceMock.mockRejectedValue(new Error('ThrottlingException'))
    await expect(port.race(raceCase)).rejects.toThrow('ThrottlingException')
  })
})

describe('argue', () => {
  it('sends the summary and verdict to argueModel and guards both ends', async () => {
    checkMock.mockResolvedValue({ blocked: false, units: 1 })
    argueMock.mockResolvedValue(argueRun('A calm reply.'))
    const result = await port.argue(argueCase)
    expect(argueMock).toHaveBeenCalledWith(
      expect.anything(),
      { stepSummary: 'Copy files to a backup folder', verdict: 'plain-code' },
      expect.any(Function),
    )
    expect(checkMock.mock.calls.map(([, req]) => [req.source, req.text])).toEqual([
      ['INPUT', 'Copy files to a backup folder'],
      ['OUTPUT', 'A calm reply.'],
    ])
    expect(result.out).toEqual({
      blocked: false,
      text: 'A calm reply.',
      stopReason: 'end_turn',
    })
    expect(result.guardrailTextUnits).toBe(2)
    expect(result.inputTokens).toBe(70)
  })

  it('sets max_tokens when the reply used the whole output limit', async () => {
    checkMock.mockResolvedValue({ blocked: false, units: 1 })
    argueMock.mockResolvedValue(argueRun('Cut off', 400))
    const result = await port.argue(argueCase)
    expect(result.out).toEqual({
      blocked: false,
      text: 'Cut off',
      stopReason: 'max_tokens',
    })
  })

  it('maps blocked input and blocked output', async () => {
    checkMock.mockResolvedValueOnce({ blocked: true, units: 1 })
    expect((await port.argue(argueCase)).out).toEqual({ blocked: 'input' })
    expect(argueMock).not.toHaveBeenCalled()
    checkMock
      .mockResolvedValueOnce({ blocked: false, units: 1 })
      .mockResolvedValueOnce({ blocked: true, units: 1 })
    argueMock.mockResolvedValue(argueRun('Reply'))
    expect((await port.argue(argueCase)).out).toEqual({ blocked: 'output' })
  })

  it('maps an empty model output to empty text so the scorer fails the case', async () => {
    checkMock.mockResolvedValue({ blocked: false, units: 1 })
    argueMock.mockRejectedValue(new Error('empty_model_output'))
    const result = await port.argue(argueCase)
    expect(result.out).toEqual({ blocked: false, text: '', stopReason: 'end_turn' })
    expect(checkMock).toHaveBeenCalledTimes(1)
    expect(result.guardrailTextUnits).toBe(1)
  })

  it('still aborts on any other model error', async () => {
    checkMock.mockResolvedValue({ blocked: false, units: 1 })
    argueMock.mockRejectedValue(new Error('ThrottlingException'))
    await expect(port.argue(argueCase)).rejects.toThrow('ThrottlingException')
  })
})

describe('toolCall', () => {
  it('passes temperature, max tokens and the forced tool name through', async () => {
    bedrock.on(ConverseCommand).resolves({
      output: {
        message: {
          role: 'assistant',
          content: [
            {
              toolUse: {
                toolUseId: 't1',
                name: 'grade',
                input: { pass: true, reason: 'ok' },
              },
            },
          ],
        },
      },
      usage: { inputTokens: 55, outputTokens: 9, totalTokens: 64 },
    })
    const result = await port.toolCall({
      system: 'sys',
      user: 'usr',
      toolName: 'grade',
      toolSchema: { type: 'object' },
      maxTokens: 200,
      temperature: 0,
    })
    const input = bedrock.commandCalls(ConverseCommand)[0]?.args[0].input
    expect(input?.inferenceConfig).toEqual({ maxTokens: 200, temperature: 0 })
    expect(input?.toolConfig?.toolChoice).toEqual({ tool: { name: 'grade' } })
    expect(input?.toolConfig?.tools?.[0]?.toolSpec?.name).toBe('grade')
    expect(input?.additionalModelRequestFields).toEqual({
      reasoningConfig: { type: 'disabled' },
    })
    expect(input?.modelId).toBe('us.amazon.nova-2-lite-v1:0')
    expect(result.toolInput).toEqual({ pass: true, reason: 'ok' })
    expect(result.inputTokens).toBe(55)
    expect(result.outputTokens).toBe(9)
  })

  it('returns a null tool input when the model made no tool call', async () => {
    bedrock.on(ConverseCommand).resolves({
      output: { message: { role: 'assistant', content: [{ text: 'no' }] } },
    })
    const result = await port.toolCall({
      system: 's',
      user: 'u',
      toolName: 'grade',
      toolSchema: { type: 'object' },
      maxTokens: 200,
      temperature: 0,
    })
    expect(result.toolInput).toBeNull()
    expect(result.inputTokens).toBe(0)
  })

  it('never routes the judge through the guardrail', async () => {
    bedrock.on(ConverseCommand).resolves({})
    await port.toolCall({
      system: 's',
      user: 'u',
      toolName: 'grade',
      toolSchema: { type: 'object' },
      maxTokens: 200,
      temperature: 0,
    })
    expect(checkMock).not.toHaveBeenCalled()
  })
})
