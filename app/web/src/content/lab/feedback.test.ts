import { describe, expect, it } from 'vitest'

import { assertNoClaims } from '@/test/noClaims'

import { FEEDBACK_ENDPOINT, FEEDBACK_REASONS, feedbackCopy } from './feedback'

describe('feedback copy', () => {
  it('matches the api enum exactly', () => {
    expect(FEEDBACK_REASONS.map((r) => r.id)).toEqual([
      'needs-less',
      'needs-more',
      'questions-missed',
    ])
    expect(FEEDBACK_ENDPOINT).toBe('/api/feedback')
  })

  it('has short, distinct labels', () => {
    const labels = FEEDBACK_REASONS.map((r) => r.label)
    expect(new Set(labels).size).toBe(3)
    for (const label of labels) expect(label.length).toBeLessThanOrEqual(40)
  })

  it('makes no client, team-size or outcome claims', () => {
    for (const text of [
      ...FEEDBACK_REASONS.map((r) => r.label),
      ...Object.values(feedbackCopy),
    ])
      assertNoClaims(text)
  })

  it('pins the confirmation and Send description', () => {
    expect(feedbackCopy.sent).toMatch(/^Thanks\./)
    expect(feedbackCopy.pickFirst).toBe('Pick a reason first')
  })

  it('names the rule id in the privacy note', () => {
    expect(feedbackCopy.note).toBe(
      'We keep only the verdict, the rubric rule and version, and your reason. Nothing about you or your steps.',
    )
  })
})
