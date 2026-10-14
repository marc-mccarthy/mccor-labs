import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ui } from '@/content/ui'
import { signedPostJson } from '@/lib/signedPost'
import {
  CONTACT_TIMEOUT_MS,
  MAILTO_BODY_MAX,
  MESSAGE_MIN,
  contactMailtoHref,
  submitContact,
  validateContact,
  type ContactRequest,
} from './contact'

vi.mock('@/lib/signedPost', () => ({ signedPostJson: vi.fn() }))

const valid: ContactRequest = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '(202) 555-0123',
  message: 'We need a marketing site and a client portal.',
  honeypot: '',
  elapsedMs: 5000,
}

beforeEach(() => {
  vi.mocked(signedPostJson).mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('validateContact', () => {
  it('accepts a well-formed submission', () => {
    expect(validateContact(valid)).toEqual({})
  })

  it('rejects an email longer than 254 characters, as the server does', () => {
    const local = 'a'.repeat(64)
    const atLimit = `${local}@${'b'.repeat(254 - 64 - 1 - 4)}.com`
    expect(atLimit).toHaveLength(254)
    expect(validateContact({ ...valid, email: atLimit }).email).toBeUndefined()
    expect(validateContact({ ...valid, email: `a${atLimit}` }).email).toBe(
      ui.contactErrorEmail,
    )
  })

  it('measures the company after trimming, as the server does', () => {
    const company = ` ${'c'.repeat(100)} `
    expect(validateContact({ ...valid, company }).company).toBeUndefined()
  })

  it('requires a name', () => {
    expect(validateContact({ ...valid, name: '' }).name).toBeTruthy()
  })

  it('rejects a malformed email', () => {
    expect(validateContact({ ...valid, email: 'nope' }).email).toBeTruthy()
  })

  it('requires a phone number', () => {
    expect(validateContact({ ...valid, phone: '' }).phone).toBe(ui.contactErrorPhone)
    expect(validateContact({ ...valid, phone: '   ' }).phone).toBe(ui.contactErrorPhone)
  })

  it('rejects an invalid phone number with the invalid message', () => {
    expect(validateContact({ ...valid, phone: '5551234567' }).phone).toBe(
      ui.contactErrorPhoneInvalid,
    )
    expect(validateContact({ ...valid, phone: '202555' }).phone).toBe(
      ui.contactErrorPhoneInvalid,
    )
  })

  it.each(['2025550123', '+12025550123', '(202) 555-0123'])(
    'accepts the phone number %s',
    (phone) => {
      expect(validateContact({ ...valid, phone }).phone).toBeUndefined()
    },
  )

  it('requires a message of at least ten characters', () => {
    expect(validateContact({ ...valid, message: 'too short' }).message).toBeTruthy()
  })

  it('uses MESSAGE_MIN as the message boundary', () => {
    const at = 'x'.repeat(MESSAGE_MIN)
    const under = 'x'.repeat(MESSAGE_MIN - 1)
    expect(validateContact({ ...valid, message: at }).message).toBeUndefined()
    expect(validateContact({ ...valid, message: under }).message).toBeTruthy()
  })

  it('rejects an over-long message rather than sending it', () => {
    expect(validateContact({ ...valid, message: 'x'.repeat(5001) }).message).toBeTruthy()
  })

  it('rejects a name over 100 characters', () => {
    expect(validateContact({ ...valid, name: 'x'.repeat(101) }).name).toBeTruthy()
  })

  it('rejects a company name over 100 characters', () => {
    expect(validateContact({ ...valid, company: 'x'.repeat(101) }).company).toBeTruthy()
  })
})

describe('submitContact', () => {
  it('returns a server error without fetching when no endpoint is configured', async () => {
    const result = await submitContact(valid, null)
    expect(result).toEqual({ ok: false, error: 'server' })
    expect(signedPostJson).not.toHaveBeenCalled()
  })

  it('refuses to send a payload it knows is invalid', async () => {
    const result = await submitContact(
      { ...valid, email: 'nope' },
      'https://api.test/contact',
    )
    expect(result).toEqual({ ok: false, error: 'validation' })
    expect(signedPostJson).not.toHaveBeenCalled()
  })

  it('reports success on a 200', async () => {
    vi.mocked(signedPostJson).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    expect(await submitContact(valid, 'https://api.test/contact')).toEqual({
      ok: true,
      reference: null,
    })
  })

  it('maps a 429 to rate_limit', async () => {
    vi.mocked(signedPostJson).mockResolvedValue(new Response('', { status: 429 }))
    expect(await submitContact(valid, 'https://api.test/contact')).toEqual({
      ok: false,
      error: 'rate_limit',
    })
  })

  it('maps a 400 to validation', async () => {
    vi.mocked(signedPostJson).mockResolvedValue(new Response('', { status: 400 }))
    expect(await submitContact(valid, 'https://api.test/contact')).toEqual({
      ok: false,
      error: 'validation',
    })
  })

  it('maps a network failure to server rather than throwing', async () => {
    vi.mocked(signedPostJson).mockRejectedValue(new Error('offline'))
    expect(await submitContact(valid, 'https://api.test/contact')).toEqual({
      ok: false,
      error: 'server',
    })
  })

  it('forwards a filled honeypot to the server rather than filtering it client-side', async () => {
    const filled = { ...valid, honeypot: 'a bot wrote this' }
    vi.mocked(signedPostJson).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    const result = await submitContact(filled, 'https://api.test/contact')
    expect(signedPostJson).toHaveBeenCalledWith('https://api.test/contact', {
      ...filled,
      phone: '+12025550123',
    })
    expect(result).toEqual({ ok: true, reference: null })
  })

  it('posts the phone number in E.164 form', async () => {
    vi.mocked(signedPostJson).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    await submitContact(valid, 'https://api.test/contact')
    const body = vi.mocked(signedPostJson).mock.calls[0]?.[1] as ContactRequest
    expect(body.phone).toBe('+12025550123')
  })

  it('refuses to send an invalid phone number', async () => {
    const result = await submitContact(
      { ...valid, phone: '5551234567' },
      'https://api.test/contact',
    )
    expect(result).toEqual({ ok: false, error: 'validation' })
    expect(signedPostJson).not.toHaveBeenCalled()
  })

  it('returns the reference from a 200', async () => {
    vi.mocked(signedPostJson).mockResolvedValue(
      new Response(JSON.stringify({ ok: true, reference: 'AB12CD34' }), { status: 200 }),
    )
    expect(await submitContact(valid, '/api/contact')).toEqual({
      ok: true,
      reference: 'AB12CD34',
    })
  })

  it('maps a 429 with reason daily_cap to daily_cap', async () => {
    vi.mocked(signedPostJson).mockResolvedValue(
      new Response(JSON.stringify({ reason: 'daily_cap' }), { status: 429 }),
    )
    expect(await submitContact(valid, '/api/contact')).toEqual({
      ok: false,
      error: 'daily_cap',
    })
  })

  it('maps a 429 with a non-JSON body to rate_limit', async () => {
    vi.mocked(signedPostJson).mockResolvedValue(new Response('Too Many', { status: 429 }))
    expect(await submitContact(valid, '/api/contact')).toEqual({
      ok: false,
      error: 'rate_limit',
    })
  })

  it('maps a 400 with reason too_fast to too_fast', async () => {
    vi.mocked(signedPostJson).mockResolvedValue(
      new Response(JSON.stringify({ reason: 'too_fast' }), { status: 400 }),
    )
    expect(await submitContact(valid, '/api/contact')).toEqual({
      ok: false,
      error: 'too_fast',
    })
  })

  it('maps a 400 with reason validation to validation', async () => {
    vi.mocked(signedPostJson).mockResolvedValue(
      new Response(JSON.stringify({ reason: 'validation' }), { status: 400 }),
    )
    expect(await submitContact(valid, '/api/contact')).toEqual({
      ok: false,
      error: 'validation',
    })
  })
})

describe('submitContact timeout', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('gives up on a hung request after the timeout and reports a server error', async () => {
    vi.useFakeTimers()
    vi.mocked(signedPostJson).mockImplementation(
      () => new Promise<Response>(() => undefined),
    )
    const pending = submitContact(valid, 'https://api.test/contact')
    await vi.advanceTimersByTimeAsync(CONTACT_TIMEOUT_MS)
    expect(await pending).toEqual({ ok: false, error: 'server' })
  })

  it('leaves no pending timer after a fast response', async () => {
    vi.useFakeTimers()
    vi.mocked(signedPostJson).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    await submitContact(valid, 'https://api.test/contact')
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('contactMailtoHref', () => {
  it('carries the subject and the whole message when it fits', () => {
    expect(contactMailtoHref('hello@mccorlabs.com', 'Website enquiry', 'Hi there')).toBe(
      'mailto:hello@mccorlabs.com?subject=Website%20enquiry&body=Hi%20there',
    )
  })

  it('cuts a long message to the cap and marks the cut', () => {
    const href = contactMailtoHref(
      'hello@mccorlabs.com',
      'Website enquiry',
      'é'.repeat(5000),
    )
    const body = decodeURIComponent(href.split('&body=')[1] ?? '')
    expect(encodeURIComponent(body).length).toBeLessThanOrEqual(MAILTO_BODY_MAX)
    expect(body.endsWith('…')).toBe(true)
  })

  it('never splits a surrogate pair', () => {
    const href = contactMailtoHref(
      'hello@mccorlabs.com',
      'Website enquiry',
      '😀'.repeat(2000),
    )
    expect(() => decodeURIComponent(href.split('&body=')[1] ?? '')).not.toThrow()
  })
})
