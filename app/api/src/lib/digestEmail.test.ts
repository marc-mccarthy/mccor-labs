import { describe, expect, it } from 'vitest'
import { formatDigest } from './digestEmail'

const since = new Date('2026-10-05T13:00:00Z')
const until = new Date('2026-10-12T13:00:00Z')

describe('formatDigest', () => {
  it('lists counts in aligned plain-text columns with a total', () => {
    const { subject, text } = formatDigest({
      since,
      until,
      counts: [
        {
          ruleId: 'R4',
          verdictId: 'rules',
          reason: 'needs-less',
          rubricVersion: '1.0.0',
          count: 3,
        },
        {
          ruleId: 'R9',
          verdictId: 'language-model',
          reason: 'questions-missed',
          rubricVersion: '1.0.0',
          count: 1,
        },
      ],
    })
    expect(subject).toBe('Lab feedback: 4 marks, week to 2026-10-12')
    expect(text).toContain('Should This Be AI? feedback, 2026-10-05 to 2026-10-12')
    expect(text).toContain('4 marks in the last 7 days.')
    expect(text.split('\n')).toContain(
      'Rule  Verdict          Reason            Rubric    Count',
    )
    expect(text.split('\n')).toContain(
      'R4    rules            needs-less        1.0.0     3',
    )
    expect(text).not.toMatch(/<[a-z]/i)
  })

  it('says so when there are no marks', () => {
    const { subject, text } = formatDigest({ since, until, counts: [] })
    expect(subject).toBe('Lab feedback: 0 marks, week to 2026-10-12')
    expect(text).toContain('No marks in the last 7 days.')
  })

  it('uses the singular for one mark', () => {
    const { subject } = formatDigest({
      since,
      until,
      counts: [
        {
          ruleId: 'R4',
          verdictId: 'rules',
          reason: 'needs-less',
          rubricVersion: '1',
          count: 1,
        },
      ],
    })
    expect(subject).toBe('Lab feedback: 1 mark, week to 2026-10-12')
  })
})
