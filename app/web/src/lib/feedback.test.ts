import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signedPostJson } from '@/lib/signedPost'
import { sendFeedback } from './feedback'

vi.mock('@/lib/signedPost', () => ({ signedPostJson: vi.fn() }))
const post = vi.mocked(signedPostJson)
const body = {
  verdictId: 'rules',
  ruleId: 'R8',
  rubricVersion: '2.0.0',
  reason: 'needs-less',
} as const

beforeEach(() => {
  post.mockReset()
})

describe('sendFeedback', () => {
  it('posts exactly the four fields to /api/feedback', async () => {
    post.mockResolvedValue(new Response('{"ok":true}', { status: 202 }))
    expect(await sendFeedback({ ...body, extra: 'x' } as typeof body)).toBe('sent')
    expect(post).toHaveBeenCalledWith('/api/feedback', {
      verdictId: 'rules',
      ruleId: 'R8',
      rubricVersion: '2.0.0',
      reason: 'needs-less',
    })
    expect(
      new TextEncoder().encode(JSON.stringify(post.mock.calls[0]?.[1])).length,
    ).toBeLessThanOrEqual(512)
  })

  it('maps 429 daily_cap', async () => {
    post.mockResolvedValue(new Response('{"reason":"daily_cap"}', { status: 429 }))
    expect(await sendFeedback(body)).toBe('daily_cap')
  })

  it.each([400, 403, 500, 502])('maps %i to error', async (status) => {
    post.mockResolvedValue(new Response('{}', { status }))
    expect(await sendFeedback(body)).toBe('error')
  })

  it('maps a network failure to error', async () => {
    post.mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await sendFeedback(body)).toBe('error')
  })
})
