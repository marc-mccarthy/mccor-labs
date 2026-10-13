import { ARGUE, RACE, VERDICT_IDS, type VerdictId } from '../config'
import type { ArgueRequest, RaceExample, RaceRequest } from './types'

const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F]/

export function countChars(text: string): number {
  return Array.from(text).length
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key))
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (text === '' || CONTROL.test(text) || countChars(text) > max) return null
  return text
}

function validateExample(value: unknown): RaceExample | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ['input', 'expected'])) return null
  const input = cleanText(value.input, RACE.maxInputChars)
  const expected = cleanText(value.expected, RACE.maxExpectedChars)
  return input === null || expected === null ? null : { input, expected }
}

export function validateRace(body: unknown): RaceRequest | null {
  if (!isRecord(body) || !hasOnlyKeys(body, ['examples'])) return null
  const { examples } = body
  if (!Array.isArray(examples)) return null
  if (examples.length < RACE.minExamples || examples.length > RACE.maxExamples)
    return null
  const valid = examples.map(validateExample)
  return valid.every((example) => example !== null) ? { examples: valid } : null
}

function isVerdict(value: unknown): value is VerdictId {
  return typeof value === 'string' && (VERDICT_IDS as readonly string[]).includes(value)
}

export function validateArgue(body: unknown): ArgueRequest | null {
  if (!isRecord(body) || !hasOnlyKeys(body, ['stepSummary', 'verdict'])) return null
  const stepSummary = cleanText(body.stepSummary, ARGUE.maxSummaryChars)
  if (stepSummary === null || !isVerdict(body.verdict)) return null
  return { stepSummary, verdict: body.verdict }
}
