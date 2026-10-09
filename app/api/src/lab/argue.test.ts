import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it } from 'vitest'

import { argueModel, buildArguePrompt } from './argue'

const bedrock = mockClient(BedrockRuntimeClient)
const req = { stepSummary: 'Send invoices', verdict: 'rules' } as const

function reply(texts: string[], usage = { inputTokens: 120, outputTokens: 80 }) {
  return {
    output: { message: { role: 'assistant', content: texts.map((text) => ({ text })) } },
    usage,
  } as never
}

function stubNow(...values: number[]): () => number {
  const queue = [...values]
  return () => queue.shift() ?? 0
}

beforeEach(() => {
  bedrock.reset()
})

describe('buildArguePrompt', () => {
  it('names the rubric label, the word limit and plain text in the system prompt', () => {
    const { system } = buildArguePrompt(req)
    expect(system).toContain('A checklist your team can edit')
    expect(system).toContain('under 120 words')
    expect(system).toContain('plain text')
  })

  it('puts the step text only in the user message', () => {
    const { system, user } = buildArguePrompt(req)
    expect(user).toBe('Send invoices')
    expect(system).not.toContain('Send invoices')
  })
})

describe('argueModel', () => {
  it('sends the model id, token cap, reasoning off and no tool config', async () => {
    bedrock.on(ConverseCommand).resolves(reply(['ok']))
    await argueModel(new BedrockRuntimeClient({}), req, stubNow(0, 1))
    const input = bedrock.commandCalls(ConverseCommand)[0]?.args[0].input
    expect(input?.modelId).toBe('us.amazon.nova-2-lite-v1:0')
    expect(input?.inferenceConfig).toEqual({ maxTokens: 400 })
    expect(input?.additionalModelRequestFields).toEqual({
      reasoningConfig: { type: 'disabled' },
    })
    expect(input?.messages).toEqual([
      { role: 'user', content: [{ text: 'Send invoices' }] },
    ])
    expect(input).not.toHaveProperty('toolConfig')
  })

  it('joins text blocks, passes usage through and times the call', async () => {
    bedrock.on(ConverseCommand).resolves(reply(['Part one. ', 'Part two.']))
    const out = await argueModel(new BedrockRuntimeClient({}), req, stubNow(1000, 1750))
    expect(out.text).toBe('Part one. Part two.')
    expect(out.inputTokens).toBe(120)
    expect(out.outputTokens).toBe(80)
    expect(out.ms).toBe(750)
    expect(out.prompt).toEqual(buildArguePrompt(req))
  })

  it('throws on empty or whitespace-only output', async () => {
    bedrock.on(ConverseCommand).resolves(reply(['  ', '\n']))
    await expect(
      argueModel(new BedrockRuntimeClient({}), req, stubNow(0, 1)),
    ).rejects.toThrow('empty_model_output')
  })
})
