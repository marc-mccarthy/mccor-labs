import { describe, expect, it } from 'vitest'
import { sendCopy } from '@/content/lab/copy'
import {
  EMPTY_ANSWERS,
  RUBRIC_VERSION,
  classifyStep,
  type StepAnswers,
} from '@/content/lab/rubric'
import {
  MAILTO_BODY_MAX,
  decodeLabResult,
  encodeLabResult,
  formatLabResult,
  labMailtoHref,
  toLabResult,
} from './labResult'

const signedOff: StepAnswers = {
  ...EMPTY_ANSWERS,
  costly: 'yes',
  checkable: 'yes',
  fixedForm: 'yes',
  checklist: 'yes',
  changes: 'yes',
}
const notSure: StepAnswers = { ...EMPTY_ANSWERS, costly: 'not-sure' }

const steps = [
  { name: 'Envoyer les factures é', result: classifyStep(signedOff), answers: signedOff },
  { name: 'Second', result: classifyStep(EMPTY_ANSWERS), answers: EMPTY_ANSWERS },
  { name: 'Third', result: classifyStep(notSure), answers: notSure },
]

function rawStep(overrides: Record<string, unknown>) {
  return {
    name: null,
    verdict: 'unclear',
    humanSignOff: false,
    ruleId: 'R1',
    unanswered: false,
    ...overrides,
  }
}

function encodeRaw(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

describe('lab result fragment', () => {
  it('round-trips names, verdicts, sign-off and rule ids', () => {
    const result = toLabResult(steps, true)
    expect(decodeLabResult(encodeLabResult(result))).toEqual(result)
  })

  it('replaces tabs, bidi and separator characters in names with spaces and still decodes', () => {
    const result = toLabResult(
      [
        {
          name: 'a\tb‮c d\u0007e',
          result: classifyStep(notSure),
          answers: notSure,
        },
      ],
      true,
    )
    expect(result.steps[0]?.name).toBe('a b c d e')
    const decoded = decodeLabResult(encodeLabResult(result))
    expect(decoded).not.toBeNull()
    expect(decoded?.steps[0]?.name).toBe('a b c d e')
  })

  it('leaves names out unless the visitor opts in', () => {
    expect(toLabResult(steps, false).steps.every((step) => step.name === null)).toBe(true)
  })

  it('uses only URL-safe characters', () => {
    expect(encodeLabResult(toLabResult(steps, true))).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it.each([
    ['not base64', '!!!'],
    ['not JSON', encodeRaw('x').slice(0, 3)],
    ['wrong version', encodeRaw({ v: 2, rubricVersion: RUBRIC_VERSION, steps: [] })],
    ['no steps', encodeRaw({ v: 1, rubricVersion: RUBRIC_VERSION, steps: [] })],
    [
      'unknown verdict',
      encodeRaw({ v: 1, rubricVersion: '1.0.0', steps: [rawStep({ verdict: 'magic' })] }),
    ],
    [
      'verdict that is not its rule',
      encodeRaw({
        v: 1,
        rubricVersion: '1.0.0',
        steps: [rawStep({ verdict: 'plain-code' })],
      }),
    ],
    [
      'sign-off on keep a person',
      encodeRaw({
        v: 1,
        rubricVersion: '1.0.0',
        steps: [
          rawStep({ verdict: 'do-not-automate', humanSignOff: true, ruleId: 'R2' }),
        ],
      }),
    ],
    [
      'unanswered on a rule other than R1',
      encodeRaw({
        v: 1,
        rubricVersion: '1.0.0',
        steps: [rawStep({ ruleId: 'R4', unanswered: true })],
      }),
    ],
    [
      'name too long',
      encodeRaw({
        v: 1,
        rubricVersion: '1.0.0',
        steps: [rawStep({ name: 'x'.repeat(61) })],
      }),
    ],
    ...[
      ['a control character', 'a\u0007b'],
      ['a newline', 'a\nb'],
      ['a DEL character', 'a\u007fb'],
      ['a C1 control character', 'a\u0085b'],
      ['a line separator', 'a b'],
      ['a paragraph separator', 'a b'],
      ['a bidi override', 'a‮b'],
      ['a bidi isolate', 'a⁦b'],
    ].map(([label, name]) => [
      `a name with ${label ?? ''}`,
      encodeRaw({ v: 1, rubricVersion: '1.0.0', steps: [rawStep({ name })] }),
    ]),
    ...['1.0', '1.0.0-beta', 'v1.0.0', '1.0.x', '1.0.0\n'].map((version) => [
      `a rubric version of ${JSON.stringify(version)}`,
      encodeRaw({ v: 1, rubricVersion: version, steps: [rawStep({})] }),
    ]),
    [
      'missing unanswered',
      encodeRaw({
        v: 1,
        rubricVersion: '1.0.0',
        steps: [rawStep({ unanswered: undefined })],
      }),
    ],
    [
      'extra field',
      encodeRaw({ v: 1, rubricVersion: '1.0.0', steps: [rawStep({ note: 'hi' })] }),
    ],
    [
      'nine steps',
      encodeRaw({
        v: 1,
        rubricVersion: '1.0.0',
        steps: Array.from({ length: 9 }, () => rawStep({})),
      }),
    ],
  ])('rejects %s without throwing', (_label, encoded) => {
    expect(decodeLabResult(encoded)).toBeNull()
  })

  it('marks only a step with no answers at all as unanswered', () => {
    expect(toLabResult(steps, false).steps.map((step) => step.unanswered)).toEqual([
      false,
      true,
      false,
    ])
  })

  it('formats one readable line per step and ends with the ask line', () => {
    expect(formatLabResult(toLabResult(steps, false)).split('\n')).toEqual([
      'Results from Should This Be AI? (the wrong-tool test)',
      `Step 1: A Checklist Your Team Can Edit + human sign-off (rule R8, rubric ${RUBRIC_VERSION})`,
      `Step 2: not answered yet (rule R1, rubric ${RUBRIC_VERSION})`,
      `Step 3: Worth a Conversation (rule R1, rubric ${RUBRIC_VERSION})`,
      sendCopy.ask,
    ])
    expect(sendCopy.ask).toBe('What I would like help with: ')
  })

  it('caps the mailto body at whole lines, says so, and keeps the ask line last', () => {
    const long = Array.from({ length: 8 }, (_, i) => ({
      name: `${'é'.repeat(59)}${String(i)}`,
      result: classifyStep(EMPTY_ANSWERS),
      answers: EMPTY_ANSWERS,
    }))
    const href = labMailtoHref(
      'a@mccorlabs.com',
      formatLabResult(toLabResult(long, true)),
    )
    const body = new URL(href).searchParams.get('body') ?? ''
    expect(encodeURIComponent(body).length).toBeLessThanOrEqual(MAILTO_BODY_MAX)
    expect(body).toContain(sendCopy.truncated)
    expect(body.split('\n').at(-1)).toBe(sendCopy.ask)
    expect(href.startsWith('mailto:a@mccorlabs.com?subject=')).toBe(true)
  })
})
