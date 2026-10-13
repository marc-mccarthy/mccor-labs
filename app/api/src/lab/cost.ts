import { ARGUE, CAPS, GUARDRAIL, LAMBDA, PRICES, RACE } from '../config'

export function textUnits(chars: number): number {
  return Math.max(1, Math.ceil(chars / GUARDRAIL.charsPerUnit))
}

export function modelCostUsd(usage: {
  inputTokens: number
  outputTokens: number
}): number {
  return (
    (usage.inputTokens / 1000) * PRICES.inputPer1kTokensUsd +
    (usage.outputTokens / 1000) * PRICES.outputPer1kTokensUsd
  )
}

export function guardrailCostUsd(units: number): number {
  return (units / 1000) * PRICES.guardrailPer1kUnitsUsd
}

export function lambdaCostUsd(ms: number): number {
  return (
    (LAMBDA.memoryMb / 1024) * (ms / 1000) * PRICES.lambdaPerGbSecondUsd +
    PRICES.lambdaPerRequestUsd
  )
}

export function runCostUsd(run: {
  inputTokens: number
  outputTokens: number
  guardrailUnits: number
  ms: number
}): number {
  return modelCostUsd(run) + guardrailCostUsd(run.guardrailUnits) + lambdaCostUsd(run.ms)
}

const WORST_MS = LAMBDA.timeoutS * 1000

export function worstCaseRaceUsd(): number {
  const inputChars = RACE.maxExamples * (RACE.maxInputChars + RACE.maxExpectedChars)
  const outputChars = RACE.maxExamples * RACE.maxExpectedChars
  const units =
    (textUnits(inputChars) + textUnits(outputChars)) *
    GUARDRAIL.worstCaseBillingMultiplier
  return runCostUsd({
    inputTokens: RACE.worstInputTokens,
    outputTokens: RACE.maxOutputTokens,
    guardrailUnits: units,
    ms: WORST_MS,
  })
}

export function worstCaseArgueUsd(): number {
  const units =
    (textUnits(ARGUE.maxSummaryChars) + textUnits(ARGUE.worstOutputChars)) *
    GUARDRAIL.worstCaseBillingMultiplier
  return runCostUsd({
    inputTokens: ARGUE.worstInputTokens,
    outputTokens: ARGUE.maxOutputTokens,
    guardrailUnits: units,
    ms: WORST_MS,
  })
}

export function worstCaseMonthlyUsd(days = 31): number {
  return (
    days * (CAPS.raceDaily * worstCaseRaceUsd() + CAPS.argueDaily * worstCaseArgueUsd())
  )
}
