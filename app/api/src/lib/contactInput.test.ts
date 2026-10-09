import { describe, expect, it } from 'vitest'
import { checkContact } from './contactInput'

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: '',
  budget: '',
  message: 'We need a marketing site and a client portal.',
  honeypot: '',
  elapsedMs: 5000,
}

describe('checkContact', () => {
  it('accepts a well-formed submission and trims it', () => {
    expect(checkContact({ ...valid, name: '  Ada Lovelace ' })).toEqual({
      kind: 'ok',
      value: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        company: '',
        budget: '',
        message: 'We need a marketing site and a client portal.',
      },
    })
  })

  it('treats a filled honeypot as spam before any other check', () => {
    expect(checkContact({ ...valid, honeypot: 'bot', elapsedMs: 1 })).toEqual({
      kind: 'spam',
    })
  })

  it('rejects a form sent in under 3 seconds', () => {
    expect(checkContact({ ...valid, elapsedMs: 2999 })).toEqual({
      kind: 'invalid',
      reason: 'too_fast',
    })
  })

  it.each([
    ['a non-object body', null],
    ['an array body', []],
    ['a missing elapsedMs', { ...valid, elapsedMs: undefined }],
    ['a non-string name', { ...valid, name: 5 }],
    ['an empty name', { ...valid, name: '   ' }],
    ['a name over 100 characters', { ...valid, name: 'x'.repeat(101) }],
    ['a malformed email', { ...valid, email: 'nope' }],
    ['an email with a line break', { ...valid, email: 'a@b.co\r\nBcc: x@y.z' }],
    ['a company over 100 characters', { ...valid, company: 'x'.repeat(101) }],
    ['a budget over 40 characters', { ...valid, budget: 'x'.repeat(41) }],
    ['a message under 10 characters', { ...valid, message: 'too short' }],
    ['a message over 5000 characters', { ...valid, message: 'x'.repeat(5001) }],
  ])('rejects %s', (_label, body) => {
    expect(checkContact(body)).toEqual({ kind: 'invalid', reason: 'validation' })
  })

  it('accepts a missing optional company and budget', () => {
    expect(checkContact({ ...valid, company: undefined, budget: undefined }).kind).toBe(
      'ok',
    )
  })
})
