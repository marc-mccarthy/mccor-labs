import { describe, expect, it } from 'vitest'
import { MARK_TTL_DAYS, toMarkItem } from './mark'

describe('toMarkItem', () => {
  it('keys by mark#<id> and expires after 90 days', () => {
    const now = new Date('2026-10-09T12:00:00Z')
    const item = toMarkItem(
      { verdictId: 'rules', ruleId: 'R4', rubricVersion: '1.0.0', reason: 'needs-more' },
      now,
      '01ABC',
    )
    expect(MARK_TTL_DAYS).toBe(90)
    expect(item).toEqual({
      pk: 'mark#01ABC',
      verdictId: 'rules',
      ruleId: 'R4',
      rubricVersion: '1.0.0',
      reason: 'needs-more',
      createdAt: '2026-10-09T12:00:00.000Z',
      expiresAt: Math.floor(now.getTime() / 1000) + 90 * 86400,
    })
  })
})
