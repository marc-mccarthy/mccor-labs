import { describe, expect, it } from 'vitest'
import { assertNoClaims } from '@/test/noClaims'
import * as copyModule from './copy'
import { fillTemplate, questionCopy, stepLabel, verdictCopy, verdictPhrase } from './copy'
import { RULES } from './rules'

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
      'plain-code': { label: 'A simple program', gloss: 'Fixed steps, no judgment' },
      rules: { label: 'A checklist your team can edit', gloss: 'If this, then that' },
      'classic-ml': {
        label: 'A model trained on your past cases',
        gloss: 'Predicts from history',
      },
      'language-model': { label: 'An AI language model', gloss: 'Reads and writes text' },
      'do-not-automate': {
        label: 'Keep a person on it',
        gloss: 'The judgment is the job',
      },
      unclear: {
        label: 'Worth a conversation',
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
