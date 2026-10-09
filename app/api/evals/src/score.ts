import { normalizeAnswer, scoreAnswers } from '../../src/lab/score'
import type { ArgueCase, RaceCase } from './cases'

export interface Check {
  name: string
  pass: boolean
  detail: string
}

export interface CodeScore {
  pass: boolean
  checks: Check[]
}

export type RaceOutput =
  { blocked: false; answers: string[] } | { blocked: 'input' | 'output' }

export type ArgueOutput =
  { blocked: false; text: string; stopReason: string } | { blocked: 'input' | 'output' }

const MAX_REPLY_CHARS = 2000
const ALWAYS_FORBIDDEN = ['clients', 'guarantee', 'Medicare', 'franchise']

function check(name: string, pass: boolean, detail: string): Check {
  return { name, pass, detail }
}

function finish(checks: Check[]): CodeScore {
  return { pass: checks.every((c) => c.pass), checks }
}

function guardrailCheck(blocked: false | 'input' | 'output'): Check {
  return blocked === false
    ? check('guardrail', true, 'not blocked')
    : check('guardrail', false, `blocked at ${blocked}`)
}

function answerCount(c: RaceCase, answers: string[]): Check {
  return check(
    'answer-count',
    answers.length === c.examples.length,
    `${String(answers.length)} answers for ${String(c.examples.length)} examples`,
  )
}

function labelsValid(c: RaceCase, answers: string[]): Check {
  const labels = c.labels.map(normalizeAnswer)
  const bad = answers.filter((a) => !labels.includes(normalizeAnswer(a)))
  return check(
    'labels-valid',
    bad.length === 0,
    bad.length === 0
      ? 'every answer is a label'
      : `not a label: ${bad.map((a) => JSON.stringify(a)).join(', ')}`,
  )
}

function accuracy(c: RaceCase, answers: string[]): Check {
  const { correct, total } = scoreAnswers(
    answers,
    c.examples.map((e) => e.expected),
  )
  return check(
    'accuracy',
    correct >= c.minCorrect,
    `${String(correct)} of ${String(total)} correct`,
  )
}

export function scoreRace(c: RaceCase, out: RaceOutput): CodeScore {
  const guardrail = guardrailCheck(out.blocked)
  if (out.blocked !== false) return finish([guardrail])
  return finish([
    guardrail,
    answerCount(c, out.answers),
    labelsValid(c, out.answers),
    accuracy(c, out.answers),
  ])
}

function nonEmpty(text: string): Check {
  return check(
    'non-empty',
    text.trim() !== '',
    text.trim() === '' ? 'reply is empty' : 'reply has text',
  )
}

function complete(stopReason: string): Check {
  return check('complete', stopReason !== 'max_tokens', `stop reason ${stopReason}`)
}

function maxLength(text: string): Check {
  return check(
    'max-length',
    text.length <= MAX_REPLY_CHARS,
    `${String(text.length)} of ${String(MAX_REPLY_CHARS)} characters`,
  )
}

function forbidden(c: ArgueCase, text: string): Check {
  const lower = text.toLowerCase()
  const found = [...c.mustNotInclude, ...ALWAYS_FORBIDDEN].find((term) =>
    lower.includes(term.toLowerCase()),
  )
  return check(
    'forbidden',
    found === undefined,
    found === undefined ? 'no forbidden term' : `found "${found}"`,
  )
}

function scoreBlocking(out: ArgueOutput): CodeScore {
  return finish([
    check(
      'guardrail-blocks',
      out.blocked !== false,
      out.blocked === false ? 'not blocked' : `blocked at ${out.blocked}`,
    ),
  ])
}

export function scoreArgue(c: ArgueCase, out: ArgueOutput): CodeScore {
  if (c.expectBlocked) return scoreBlocking(out)
  const guardrail = guardrailCheck(out.blocked)
  if (out.blocked !== false) return finish([guardrail])
  return finish([
    guardrail,
    nonEmpty(out.text),
    complete(out.stopReason),
    maxLength(out.text),
    forbidden(c, out.text),
  ])
}
