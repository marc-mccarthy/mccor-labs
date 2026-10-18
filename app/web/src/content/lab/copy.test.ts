import { afterAll, describe, expect, it, vi } from 'vitest'
import { assertNoClaims } from '@/test/noClaims'
import * as copyModule from './copy'
import {
  fillTemplate,
  labLive,
  presets,
  questionCopy,
  stepLabel,
  verdictCopy,
  verdictPhrase,
} from './copy'
import { NAME_MAX } from './limits'
import { classifyStep, visibleQuestions } from './rubric'
import { RULES } from './rules'

async function loadMethodBody(live: boolean): Promise<string> {
  vi.stubEnv('NEXT_PUBLIC_LAB_LIVE', live ? '1' : '0')
  vi.resetModules()
  return (await import('./copy')).labPageCopy.methodBody
}

const liveMethodBody = await loadMethodBody(true)
const quietMethodBody = await loadMethodBody(false)

afterAll(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

const EXPECTED: Readonly<Record<string, readonly string[]>> = {
  'invoice-intake': ['R5', 'R7+', 'R8+', 'R2'],
  'support-inbox': ['R5', 'R7', 'R10', 'R5+'],
  'quote-requests': ['R5', 'R8+', 'R10+', 'R11'],
}

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value !== null && typeof value === 'object')
    return Object.values(value).flatMap(strings)
  return []
}

const ALL_TEXT = [...strings(Object.values(copyModule)), ...RULES.map((rule) => rule.why)]

describe('lab copy', () => {
  it('makes no client, team-size, percent or outcome claim in copy.ts or any rule reason', () => {
    expect(RULES).toHaveLength(13)
    for (const text of ALL_TEXT) {
      assertNoClaims(text)
    }
  })

  it.each([
    'Built for Medicare teams',
    'Our franchise partners',
    'Trusted by our clients',
    'A team of 40 engineers',
    'Cuts errors by 30%',
    'Saves you time every week',
    'Guaranteed results',
  ])('the claims check rejects "%s"', (claim) => {
    expect(() => {
      assertNoClaims(claim)
    }).toThrow()
  })

  it('uses the verdict labels and glosses the spec fixes', () => {
    expect(verdictCopy).toEqual({
      'plain-code': { label: 'A Simple Program', gloss: 'Fixed steps, no judgment' },
      rules: { label: 'A Checklist Your Team Can Edit', gloss: 'If this, then that' },
      'classic-ml': {
        label: 'A Model Trained on Your Past Cases',
        gloss: 'Predicts from history',
      },
      'language-model': { label: 'An AI Language Model', gloss: 'Reads and writes text' },
      'do-not-automate': {
        label: 'Keep a Person on It',
        gloss: 'The judgment is the job',
      },
      unclear: {
        label: 'Worth a Conversation',
        gloss: 'Answer the not-sure questions to sharpen this',
      },
    })
  })

  it('asks question 1 about both the information and the result', () => {
    expect(questionCopy.fixedForm.text).toBe(
      'Do the information it uses and the result it produces both come in a fixed form, like spreadsheet rows or form fields, rather than emails, PDFs, photos or written paragraphs?',
    )
    expect(questionCopy.fixedForm.example).toMatch(/the result is a written reply\.$/)
  })

  it('asks follow-up 2b about changes the team makes itself', () => {
    expect(questionCopy.changes.text).toBe(
      'Does your team change this checklist themselves, more than a few times a year, such as prices, limits or who qualifies?',
    )
  })

  it('fills template slots and throws on a missing one', () => {
    expect(fillTemplate('Step {n}', { n: 2 })).toBe('Step 2')
    expect(() => fillTemplate('Step {n}', {})).toThrow(/\{n\}/)
  })

  it('labels a step with and without a name', () => {
    expect(stepLabel(2, '')).toBe('Step 2')
    expect(stepLabel(2, '  Send invoices ')).toBe('Step 2, Send invoices')
  })

  it('phrases a verdict for the status region in lower case with the modifier', () => {
    expect(verdictPhrase('plain-code', false)).toBe('a simple program')
    expect(verdictPhrase('rules', true)).toBe(
      'a checklist your team can edit + human sign-off',
    )
  })
})

const FREQUENCIES = ['daily', 'weekly', 'monthly-or-less'] as const

type LiveKey = keyof typeof labLive
type LiveFunctionKey = {
  [K in LiveKey]: (typeof labLive)[K] extends (...args: never[]) => string ? K : never
}[LiveKey]

const LIVE_CALLS: Record<LiveFunctionKey, () => string[]> = {
  exampleInputLabel: () => [labLive.exampleInputLabel(2)],
  exampleExpectedLabel: () => [labLive.exampleExpectedLabel(2)],
  removeExample: () => [labLive.removeExample(2)],
  accuracy: () => [labLive.accuracy(2, 3)],
  monthly: () => FREQUENCIES.map((frequency) => labLive.monthly(frequency, '0.36')),
  monthlyUnderFloor: () =>
    FREQUENCIES.map((frequency) => labLive.monthlyUnderFloor(frequency)),
  priceNote: () => [labLive.priceNote('2026-10-09')],
  runsLeft: () => [labLive.runsLeft(7)],
  recordedCap: () => [labLive.recordedCap('Oct 9, 2026, 10:00 AM UTC')],
  recordedOff: () => [labLive.recordedOff('Oct 9, 2026, 10:00 AM UTC')],
  recordedPreview: () => [labLive.recordedPreview('Oct 9, 2026, 10:00 AM UTC')],
  recordedArgueFor: () => [
    labLive.recordedArgueFor('Check each invoice against the order'),
  ],
  announceRunning: () => [labLive.announceRunning('Race this step')],
  announceDone: () => [labLive.announceDone('Race this step')],
}

function liveOutputs(): string[] {
  const text = Object.values(labLive).flatMap((value) =>
    typeof value === 'function' ? [] : strings(value),
  )
  return [...text, ...Object.values(LIVE_CALLS).flatMap((call) => call())]
}

describe('live lab copy', () => {
  it('samples every function member of labLive', () => {
    const functionKeys = Object.entries(labLive)
      .filter(([, value]) => typeof value === 'function')
      .map(([key]) => key)
      .sort()
    expect(Object.keys(LIVE_CALLS).sort()).toEqual(functionKeys)
    expect(Object.keys(LIVE_CALLS)).toHaveLength(functionKeys.length)
  })

  it('makes no client, team-size, percent or outcome claim', () => {
    for (const text of liveOutputs()) {
      assertNoClaims(text)
    }
  })

  it('contains no dollar sign', () => {
    for (const text of liveOutputs()) {
      expect(text).not.toContain('$')
    }
  })

  it('states the input notice the spec fixes', () => {
    expect(labLive.inputNotice).toBe(
      "Sent to Amazon Bedrock to run this test, not stored by us. Don't paste customer names or personal details.",
    )
  })

  it('words the monthly line in USD for each frequency', () => {
    expect(labLive.monthly('daily', '0.36')).toBe(
      'If this runs once a day, one item each time: about 0.36 USD a month for the model, against about 0 USD for a simple program',
    )
    expect(labLive.monthly('weekly', '0.05')).toMatch(/^If this runs once a week,/)
    expect(labLive.monthly('monthly-or-less', '0.01')).toMatch(
      /^If this runs once a month or less,/,
    )
    for (const frequency of FREQUENCIES) {
      expect(labLive.monthly(frequency, '0.36')).not.toContain('USD USD')
    }
  })

  it('words the below-floor monthly line without "about"', () => {
    expect(labLive.monthlyUnderFloor('daily')).toBe(
      'If this runs once a day, one item each time: less than 0.0001 USD a month for the model, against about 0 USD for a simple program',
    )
  })

  it('names the frequency phrases', () => {
    expect(labLive.frequencyPhrase).toEqual({
      daily: 'once a day',
      weekly: 'once a week',
      'monthly-or-less': 'once a month or less',
    })
  })

  it('attributes the argue text to a model and the verdict to the rubric', () => {
    expect(labLive.argueAttribution).toBe(
      'written by a model; the verdict is from the rubric',
    )
  })

  it('tells the visitor a live test sends its text to Amazon Bedrock when the lab is live', () => {
    expect(liveMethodBody).toBe(
      "Every verdict comes from a fixed set of rules written in code. For any set of answers exactly one rule matches, so the same answers always give the same verdict. Nothing you type leaves this page unless you send it to us, or run a live test, which sends that test's text to Amazon Bedrock.",
    )
  })

  it('names no live test or Bedrock when the lab is not live', () => {
    expect(quietMethodBody).toBe(
      'Every verdict comes from a fixed set of rules written in code. For any set of answers exactly one rule matches, so the same answers always give the same verdict. Nothing you type leaves this page unless you send it to us.',
    )
    expect(quietMethodBody).not.toMatch(/Bedrock|live test/)
  })

  it('makes no claim in either method body', () => {
    assertNoClaims(liveMethodBody)
    assertNoClaims(quietMethodBody)
  })
})

describe('presets', () => {
  it('offers the three spec examples with four fully answered steps each', () => {
    expect(presets.map((preset) => preset.id)).toEqual([
      'invoice-intake',
      'support-inbox',
      'quote-requests',
    ])
    for (const preset of presets) {
      expect(preset.steps).toHaveLength(4)
      for (const step of preset.steps) {
        expect(step.name.length, step.name).toBeLessThanOrEqual(NAME_MAX)
        for (const key of visibleQuestions(step.answers))
          expect(step.answers[key], `${preset.id} ${step.name} ${key}`).not.toBeNull()
        if (step.answers.checklist !== 'yes') expect(step.answers.changes).toBeNull()
        expect(step.answers.frequency).not.toBeNull()
      }
    }
  })

  it.each(presets)('$id lands on the rules and sign-offs the plan pins', (preset) => {
    expect(
      preset.steps.map((step) => {
        const result = classifyStep(step.answers)
        return `${result.ruleId}${result.humanSignOff ? '+' : ''}`
      }),
    ).toEqual(EXPECTED[preset.id])
  })
})
