import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ToolInputSchema,
} from '@aws-sdk/client-bedrock-runtime'

import { ARGUE, BEDROCK_CLIENT, MODEL_ID } from '../../src/config'
import { argueModel } from '../../src/lab/argue'
import { checkText } from '../../src/lab/guardrail'
import { raceModel } from '../../src/lab/race'
import type { ArgueCase, RaceCase } from './cases'
import type { ToolCallRequest, ToolCallResult } from './judge'
import type { ModelPort } from './run'

interface Guardrail {
  id: string
  version: string
}

const EMPTY_OUTPUT = 'empty_model_output'
const EMPTY_ANSWER = '-'

function now(): number {
  return Math.round(performance.now())
}

function createClient(): BedrockRuntimeClient {
  return new BedrockRuntimeClient({
    maxAttempts: BEDROCK_CLIENT.maxAttempts,
    requestHandler: { requestTimeout: BEDROCK_CLIENT.requestTimeoutMs },
  })
}

function guard(client: BedrockRuntimeClient, guardrail: Guardrail) {
  return (source: 'INPUT' | 'OUTPUT', text: string) =>
    checkText(client, { ...guardrail, source, text })
}

function raceInputText(c: RaceCase): string {
  return c.examples.flatMap((example) => [example.input, example.expected]).join('\n')
}

function raceOutputText(answers: string[]): string {
  return answers.map((answer) => (answer === '' ? EMPTY_ANSWER : answer)).join('\n')
}

function stopReasonFor(outputTokens: number): string {
  return outputTokens >= ARGUE.maxOutputTokens ? 'max_tokens' : 'end_turn'
}

async function race(
  client: BedrockRuntimeClient,
  guardrail: Guardrail,
  c: RaceCase,
): ReturnType<ModelPort['race']> {
  const check = guard(client, guardrail)
  const started = now()
  const blocked = (
    stage: 'input' | 'output',
    units: number,
    tokens = { inputTokens: 0, outputTokens: 0 },
  ) => ({
    out: { blocked: stage } as const,
    ...tokens,
    guardrailTextUnits: units,
    latencyMs: now() - started,
  })
  const input = await check('INPUT', raceInputText(c))
  if (input.blocked) return blocked('input', input.units)
  const run = await raceModel(client, c.examples, now)
  const output = await check('OUTPUT', raceOutputText(run.answers))
  const units = input.units + output.units
  if (output.blocked)
    return blocked('output', units, {
      inputTokens: run.inputTokens,
      outputTokens: run.outputTokens,
    })
  return {
    out: { blocked: false, answers: run.answers },
    inputTokens: run.inputTokens,
    outputTokens: run.outputTokens,
    guardrailTextUnits: units,
    latencyMs: now() - started,
  }
}

async function readArgue(client: BedrockRuntimeClient, c: ArgueCase) {
  try {
    const run = await argueModel(
      client,
      { stepSummary: c.stepSummary, verdict: c.verdict },
      now,
    )
    return { ...run, stopReason: stopReasonFor(run.outputTokens) }
  } catch (error) {
    if (error instanceof Error && error.message === EMPTY_OUTPUT) {
      return { text: '', inputTokens: 0, outputTokens: 0, stopReason: 'end_turn' }
    }
    throw error
  }
}

async function argue(
  client: BedrockRuntimeClient,
  guardrail: Guardrail,
  c: ArgueCase,
): ReturnType<ModelPort['argue']> {
  const check = guard(client, guardrail)
  const started = now()
  const input = await check('INPUT', c.stepSummary)
  if (input.blocked) {
    return {
      out: { blocked: 'input' },
      inputTokens: 0,
      outputTokens: 0,
      guardrailTextUnits: input.units,
      latencyMs: now() - started,
    }
  }
  const run = await readArgue(client, c)
  const output =
    run.text === '' ? { blocked: false, units: 0 } : await check('OUTPUT', run.text)
  return {
    out: output.blocked
      ? { blocked: 'output' }
      : { blocked: false, text: run.text, stopReason: run.stopReason },
    inputTokens: run.inputTokens,
    outputTokens: run.outputTokens,
    guardrailTextUnits: input.units + output.units,
    latencyMs: now() - started,
  }
}

async function toolCall(
  client: BedrockRuntimeClient,
  req: ToolCallRequest,
): Promise<ToolCallResult> {
  const started = now()
  const out = await client.send(
    new ConverseCommand({
      modelId: MODEL_ID,
      system: [{ text: req.system }],
      messages: [{ role: 'user', content: [{ text: req.user }] }],
      inferenceConfig: { maxTokens: req.maxTokens, temperature: req.temperature },
      additionalModelRequestFields: { reasoningConfig: { type: 'disabled' } },
      toolConfig: {
        tools: [
          {
            toolSpec: {
              name: req.toolName,
              inputSchema: { json: req.toolSchema as ToolInputSchema.JsonMember['json'] },
            },
          },
        ],
        toolChoice: { tool: { name: req.toolName } },
      },
    }),
  )
  const toolUse = (out.output?.message?.content ?? []).find(
    (block) => block.toolUse?.name === req.toolName,
  )?.toolUse
  return {
    toolInput: toolUse?.input ?? null,
    inputTokens: out.usage?.inputTokens ?? 0,
    outputTokens: out.usage?.outputTokens ?? 0,
    latencyMs: now() - started,
  }
}

export function createModelPort(deps: { guardrail: Guardrail }): ModelPort {
  const client = createClient()
  return {
    race: (c) => race(client, deps.guardrail, c),
    argue: (c) => argue(client, deps.guardrail, c),
    toolCall: (req) => toolCall(client, req),
  }
}
