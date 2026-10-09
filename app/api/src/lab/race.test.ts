import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  buildRacePrompt,
  distinctAnswers,
  raceModel,
  raceToolConfig,
  readAnswers,
} from './race'

const bedrock = mockClient(BedrockRuntimeClient)
const labels = ['billing', 'account']
const examples = [
  { input: 'charged twice', expected: 'billing' },
  { input: 'cannot log in', expected: 'account' },
]

function stubNow(...values: number[]): () => number {
  const queue = [...values]
  return () => queue.shift() ?? 0
}

function toolReply(input: unknown) {
  return {
    output: {
      message: {
        role: 'assistant',
        content: [
          { text: 'thinking' },
          { toolUse: { toolUseId: 't-1', name: 'submit_answers', input } },
        ],
      },
    },
    usage: { inputTokens: 200, outputTokens: 40 },
  } as never
}

beforeEach(() => {
  bedrock.reset()
})

describe('distinctAnswers', () => {
  it('keeps first-seen order and drops case-insensitive repeats after trim', () => {
    const list = [
      { input: 'a', expected: 'billing' },
      { input: 'b', expected: 'Billing ' },
      { input: 'c', expected: 'account' },
    ]
    expect(distinctAnswers(list)).toEqual(['billing', 'account'])
  })
})

describe('buildRacePrompt', () => {
  it('numbers the inputs and never includes the expected answers in the user text', () => {
    const { user, labels: found } = buildRacePrompt(examples)
    expect(user).toBe('1. charged twice\n2. cannot log in')
    expect(found).toEqual(labels)
  })

  it('lists the allowed answers and asks for one submit_answers call', () => {
    const { system } = buildRacePrompt(examples)
    expect(system).toContain('"billing", "account"')
    expect(system).toContain('submit_answers tool once')
  })
})

describe('raceToolConfig', () => {
  it('forces submit_answers with an enum of the labels', () => {
    const config = raceToolConfig(labels, 2)
    expect(config).toEqual({
      tools: [
        {
          toolSpec: {
            name: 'submit_answers',
            description: expect.any(String) as string,
            inputSchema: { json: expect.any(Object) as object },
          },
        },
      ],
      toolChoice: { tool: { name: 'submit_answers' } },
    })
    const schema = config.tools?.[0]?.toolSpec?.inputSchema?.json as {
      properties: {
        answers: {
          items: {
            properties: {
              index: { type: string; minimum: number; maximum: number }
              answer: { enum: string[] }
            }
          }
        }
      }
    }
    const props = schema.properties.answers.items.properties
    expect(props.answer.enum).toEqual(labels)
    expect(props.index).toEqual({ type: 'integer', minimum: 1, maximum: 2 })
  })
})

describe('readAnswers', () => {
  it('orders answers by index', () => {
    const raw = {
      answers: [
        { index: 2, answer: 'account' },
        { index: 1, answer: 'billing' },
      ],
    }
    expect(readAnswers(raw, 2, labels)).toEqual(['billing', 'account'])
  })

  it.each([
    ['out-of-range index', { answers: [{ index: 3, answer: 'billing' }] }],
    ['index below one', { answers: [{ index: 0, answer: 'billing' }] }],
    ['non-integer index', { answers: [{ index: 1.5, answer: 'billing' }] }],
    ['unknown label', { answers: [{ index: 1, answer: 'refund' }] }],
    ['non-object raw', 'nope'],
    ['null raw', null],
    ['missing answers', {}],
    ['non-array answers', { answers: 'x' }],
  ])('leaves an empty slot for %s', (_name, raw) => {
    expect(readAnswers(raw, 2, labels)).toEqual(['', ''])
  })

  it('keeps the first answer for a duplicate index', () => {
    const raw = {
      answers: [
        { index: 1, answer: 'billing' },
        { index: 1, answer: 'account' },
      ],
    }
    expect(readAnswers(raw, 2, labels)).toEqual(['billing', ''])
  })
})

describe('raceModel', () => {
  it('sends the model id, token cap, reasoning off and the forced tool', async () => {
    bedrock.on(ConverseCommand).resolves(toolReply({ answers: [] }))
    await raceModel(new BedrockRuntimeClient({}), examples, stubNow(0, 1))
    const input = bedrock.commandCalls(ConverseCommand)[0]?.args[0].input
    expect(input?.modelId).toBe('us.amazon.nova-2-lite-v1:0')
    expect(input?.inferenceConfig).toEqual({ maxTokens: 300 })
    expect(input?.additionalModelRequestFields).toEqual({
      reasoningConfig: { type: 'disabled' },
    })
    expect(input?.toolConfig).toEqual(raceToolConfig(labels, 2))
  })

  it('returns scored-ready answers, raw tool input, usage, time and prompt', async () => {
    const raw = {
      answers: [
        { index: 1, answer: 'billing' },
        { index: 2, answer: 'account' },
      ],
    }
    bedrock.on(ConverseCommand).resolves(toolReply(raw))
    const out = await raceModel(new BedrockRuntimeClient({}), examples, stubNow(10, 510))
    expect(out.answers).toEqual(['billing', 'account'])
    expect(out.rawToolInput).toEqual(raw)
    expect(out.inputTokens).toBe(200)
    expect(out.outputTokens).toBe(40)
    expect(out.ms).toBe(500)
    const built = buildRacePrompt(examples)
    expect(out.prompt).toEqual({
      system: built.system,
      user: built.user,
      toolName: 'submit_answers',
    })
  })

  it('gives empty answers and a null raw input when no toolUse block returns', async () => {
    bedrock.on(ConverseCommand).resolves({
      output: { message: { role: 'assistant', content: [{ text: 'no tool' }] } },
      usage: { inputTokens: 5, outputTokens: 5 },
    } as never)
    const out = await raceModel(new BedrockRuntimeClient({}), examples, stubNow(0, 1))
    expect(out.answers).toEqual(['', ''])
    expect(out.rawToolInput).toBeNull()
  })
})
