import {
  ApplyGuardrailCommand,
  BedrockRuntimeClient,
} from '@aws-sdk/client-bedrock-runtime'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it } from 'vitest'

import { checkText } from './guardrail'

const bedrock = mockClient(BedrockRuntimeClient)
const input = { id: 'g-1', version: '1', source: 'INPUT', text: 'hello' } as const

beforeEach(() => {
  bedrock.reset()
})

describe('checkText', () => {
  it('passes text the guardrail leaves alone and reports units', async () => {
    bedrock.on(ApplyGuardrailCommand).resolves({
      action: 'NONE',
      usage: { contentPolicyUnits: 3 },
    } as never)
    const result = await checkText(new BedrockRuntimeClient({}), input)
    expect(result).toEqual({ blocked: false, units: 3 })
  })

  it('reports blocked when the guardrail intervenes', async () => {
    bedrock.on(ApplyGuardrailCommand).resolves({
      action: 'GUARDRAIL_INTERVENED',
      usage: { contentPolicyUnits: 1 },
    } as never)
    const result = await checkText(new BedrockRuntimeClient({}), input)
    expect(result.blocked).toBe(true)
  })

  it('sums the four policy unit counters', async () => {
    bedrock.on(ApplyGuardrailCommand).resolves({
      action: 'NONE',
      usage: {
        contentPolicyUnits: 1,
        topicPolicyUnits: 2,
        wordPolicyUnits: 3,
        sensitiveInformationPolicyUnits: 4,
      },
    } as never)
    const result = await checkText(new BedrockRuntimeClient({}), input)
    expect(result.units).toBe(10)
  })

  it('counts zero units when usage is missing', async () => {
    bedrock.on(ApplyGuardrailCommand).resolves({ action: 'NONE' } as never)
    const result = await checkText(new BedrockRuntimeClient({}), input)
    expect(result).toEqual({ blocked: false, units: 0 })
  })

  it('sends the guardrail identifier, version, source and text', async () => {
    bedrock.on(ApplyGuardrailCommand).resolves({ action: 'NONE' } as never)
    await checkText(new BedrockRuntimeClient({}), input)
    expect(bedrock.commandCalls(ApplyGuardrailCommand)[0]?.args[0].input).toEqual({
      guardrailIdentifier: 'g-1',
      guardrailVersion: '1',
      source: 'INPUT',
      content: [{ text: { text: 'hello' } }],
    })
  })

  it('rejects when the call fails', async () => {
    bedrock.on(ApplyGuardrailCommand).rejects(new Error('boom'))
    await expect(checkText(new BedrockRuntimeClient({}), input)).rejects.toThrow('boom')
  })
})
