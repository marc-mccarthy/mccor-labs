// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { signedPostJson } from './signedPost'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('signedPostJson', () => {
  it('posts the JSON body with the SHA-256 of the exact bytes sent', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }))
    await signedPostJson('/api/contact', { a: 1 })
    expect(fetchSpy).toHaveBeenCalledWith('/api/contact', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-amz-content-sha256':
          '015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862',
      },
      body: '{"a":1}',
    })
  })

  it('returns the response unchanged', async () => {
    const response = new Response('', { status: 429 })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)
    expect(await signedPostJson('/api/contact', {})).toBe(response)
  })

  it('lets a network failure reject', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    await expect(signedPostJson('/api/contact', {})).rejects.toThrow('offline')
  })
})
