import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'

import { MODEL_ID, MODEL_LABEL, PRICES_AS_OF } from '../src/config'
import { argueModel } from '../src/lab/argue'
import { runCostUsd, textUnits } from '../src/lab/cost'
import { raceModel } from '../src/lab/race'
import { programAnswers, scoreAnswers } from '../src/lab/score'
import type { ArgueRequest, ArgueTrace, RaceRequest, RaceTrace } from '../src/lab/types'
import { countChars, validateArgue, validateRace } from '../src/lab/validate'
import argueFixture from './fixtures/argue-example.json'
import raceFixture from './fixtures/race-examples.json'

const CONTENT_DIR = resolve(process.cwd(), 'app/web/src/content')
const TRACES_DIR = join(CONTENT_DIR, 'lab/traces')
const RACE_FILE = join(TRACES_DIR, 'race-recorded.json')
const ARGUE_FILE = join(TRACES_DIR, 'argue-recorded.json')

function fail(message: string): never {
  process.stderr.write(`record-trace: ${message}\n`)
  process.exit(1)
}

function now(): number {
  return Math.round(performance.now())
}

function totalChars(texts: string[]): number {
  return texts.reduce((sum, text) => sum + countChars(text), 0)
}

function guardrailUnits(inputChars: number, outputChars: number): number {
  return textUnits(inputChars) + textUnits(outputChars)
}

async function recordRace(
  client: BedrockRuntimeClient,
  request: RaceRequest,
): Promise<RaceTrace> {
  const expected = request.examples.map((example) => example.expected)
  const run = await raceModel(client, request.examples, now)
  const units = guardrailUnits(
    totalChars(request.examples.flatMap((example) => [example.input, example.expected])),
    totalChars(run.answers),
  )
  const programStart = performance.now()
  const programList = programAnswers(request.examples)
  const programMs = Math.round(performance.now() - programStart)
  return {
    schema: 1,
    kind: 'race',
    recordedAt: new Date().toISOString(),
    modelId: MODEL_ID,
    request,
    prompt: run.prompt,
    rawToolInput: run.rawToolInput,
    result: {
      kind: 'race',
      modelLabel: MODEL_LABEL,
      pricesAsOf: PRICES_AS_OF,
      model: {
        answers: run.answers,
        ...scoreAnswers(run.answers, expected),
        ms: run.ms,
        costUsd: runCostUsd({
          inputTokens: run.inputTokens,
          outputTokens: run.outputTokens,
          guardrailUnits: units,
          ms: run.ms,
        }),
        inputTokens: run.inputTokens,
        outputTokens: run.outputTokens,
        guardrailUnits: units,
      },
      program: {
        answers: programList,
        ...scoreAnswers(programList, expected),
        ms: programMs,
        costUsd: 0,
      },
    },
  }
}

async function recordArgue(
  client: BedrockRuntimeClient,
  request: ArgueRequest,
): Promise<ArgueTrace> {
  const run = await argueModel(client, request, now)
  const units = guardrailUnits(countChars(request.stepSummary), countChars(run.text))
  return {
    schema: 1,
    kind: 'argue',
    recordedAt: new Date().toISOString(),
    modelId: MODEL_ID,
    request,
    prompt: run.prompt,
    result: {
      kind: 'argue',
      modelLabel: MODEL_LABEL,
      pricesAsOf: PRICES_AS_OF,
      text: run.text,
      ms: run.ms,
      inputTokens: run.inputTokens,
      outputTokens: run.outputTokens,
      guardrailUnits: units,
      costUsd: runCostUsd({
        inputTokens: run.inputTokens,
        outputTokens: run.outputTokens,
        guardrailUnits: units,
        ms: run.ms,
      }),
    },
  }
}

async function main(): Promise<void> {
  const raceRequest = validateRace(raceFixture)
  if (raceRequest === null) fail('race fixture failed validation')
  const argueRequest = validateArgue(argueFixture)
  if (argueRequest === null) fail('argue fixture failed validation')
  if (!existsSync(CONTENT_DIR))
    fail(`run from the repository root; ${CONTENT_DIR} does not exist`)
  if (!process.argv.includes('--force')) {
    const existing = [RACE_FILE, ARGUE_FILE].filter((file) => existsSync(file))
    if (existing.length > 0)
      fail(`${existing.join(', ')} already exists; pass --force to overwrite`)
  }
  const client = new BedrockRuntimeClient({ region: 'us-east-1', maxAttempts: 2 })
  const race = await recordRace(client, raceRequest)
  const argue = await recordArgue(client, argueRequest)
  await mkdir(TRACES_DIR, { recursive: true })
  await writeFile(RACE_FILE, `${JSON.stringify(race, null, 2)}\n`)
  await writeFile(ARGUE_FILE, `${JSON.stringify(argue, null, 2)}\n`)
}

try {
  await main()
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error))
  fail(`${err.name}: ${err.message}`)
}
