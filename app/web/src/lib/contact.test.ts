import { afterEach, describe, expect, it, vi } from 'vitest'
import { submitContact, validateContact, type ContactRequest } from './contact'

const valid: ContactRequest = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'We need a marketing site and a client portal.',
  honeypot: '',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('validateContact', () => {
  it('accepts a well-formed submission', () => {
    expect(validateContact(valid)).toEqual({})
  })

  it('requires a name', () => {
    expect(validateContact({ ...valid, name: '' }).name).toBeTruthy()
  })

  it('rejects a malformed email', () => {
    expect(validateContact({ ...valid, email: 'nope' }).email).toBeTruthy()
  })

  it('requires a message of at least ten characters', () => {
    expect(validateContact({ ...valid, message: 'too short' }).message).toBeTruthy()
  })

  it('rejects an over-long message rather than sending it', () => {
    expect(validateContact({ ...valid, message: 'x'.repeat(5001) }).message).toBeTruthy()
  })
})

describe('submitContact', () => {
  it('returns a server error without fetching when no endpoint is configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await submitContact(valid, null)
    expect(result).toEqual({ ok: false, error: 'server' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('refuses to send a payload it knows is invalid', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await submitContact(
      { ...valid, email: 'nope' },
      'https://api.test/contact',
    )
    expect(result).toEqual({ ok: false, error: 'validation' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('reports success on a 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    expect(await submitContact(valid, 'https://api.test/contact')).toEqual({ ok: true })
  })

  it('maps a 429 to rate_limit', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 429 }))
    expect(await submitContact(valid, 'https://api.test/contact')).toEqual({
      ok: false,
      error: 'rate_limit',
    })
  })

  it('maps a 400 to validation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 400 }))
    expect(await submitContact(valid, 'https://api.test/contact')).toEqual({
      ok: false,
      error: 'validation',
    })
  })

  it('maps a network failure to server rather than throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    expect(await submitContact(valid, 'https://api.test/contact')).toEqual({
      ok: false,
      error: 'server',
    })
  })
})
