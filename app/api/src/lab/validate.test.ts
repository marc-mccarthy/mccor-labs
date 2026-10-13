import { describe, expect, it } from 'vitest'

import { countChars, validateArgue, validateRace } from './validate'

const two = [
  { input: 'Card charged twice', expected: 'billing' },
  { input: 'Reset my password', expected: 'account' },
]

describe('countChars', () => {
  it('counts code points', () => {
    expect(countChars('😀a')).toBe(2)
  })
})

describe('validateRace', () => {
  it('returns trimmed examples', () => {
    const body = {
      examples: [
        { input: '  Card charged twice ', expected: ' billing' },
        { input: 'Reset my password', expected: 'account ' },
      ],
    }
    expect(validateRace(body)).toEqual({ examples: two })
  })

  it('accepts two to five examples', () => {
    const five = Array.from({ length: 5 }, () => two[0])
    expect(validateRace({ examples: five })).not.toBeNull()
  })

  it('rejects non-objects', () => {
    expect(validateRace(null)).toBeNull()
    expect(validateRace('x')).toBeNull()
    expect(validateRace([])).toBeNull()
    expect(validateRace(7)).toBeNull()
  })

  it('rejects a missing or non-array examples field', () => {
    expect(validateRace({})).toBeNull()
    expect(validateRace({ examples: 'x' })).toBeNull()
    expect(validateRace({ examples: { 0: two[0] } })).toBeNull()
  })

  it('rejects too few or too many examples', () => {
    expect(validateRace({ examples: [two[0]] })).toBeNull()
    expect(validateRace({ examples: Array.from({ length: 6 }, () => two[0]) })).toBeNull()
  })

  it('rejects an extra top-level key', () => {
    expect(validateRace({ examples: two, extra: 1 })).toBeNull()
  })

  it('rejects an input over 500 code points', () => {
    const long = { input: 'é'.repeat(501), expected: 'billing' }
    expect(validateRace({ examples: [long, two[1]] })).toBeNull()
  })

  it('accepts exactly 500 code points of an emoji', () => {
    const emoji = { input: '😀'.repeat(500), expected: 'billing' }
    expect(validateRace({ examples: [emoji, two[1]] })).not.toBeNull()
  })

  it('rejects an expected answer over 40 characters', () => {
    const long = { input: 'ok', expected: 'x'.repeat(41) }
    expect(validateRace({ examples: [long, two[1]] })).toBeNull()
  })

  it('rejects an empty input after trim', () => {
    const empty = { input: '   ', expected: 'billing' }
    expect(validateRace({ examples: [empty, two[1]] })).toBeNull()
  })

  it('rejects an extra key on an example', () => {
    const noted = { input: 'a', expected: 'b', note: 'c' }
    expect(validateRace({ examples: [noted, two[1]] })).toBeNull()
  })

  it('rejects non-string fields', () => {
    expect(validateRace({ examples: [{ input: 1, expected: 'b' }, two[1]] })).toBeNull()
    expect(
      validateRace({ examples: [{ input: 'a', expected: null }, two[1]] }),
    ).toBeNull()
  })

  it('rejects control characters', () => {
    const nul = { input: 'a\u0000b', expected: 'billing' }
    expect(validateRace({ examples: [nul, two[1]] })).toBeNull()
  })
})

describe('validateArgue', () => {
  it('returns a trimmed request', () => {
    expect(validateArgue({ stepSummary: '  Send invoices ', verdict: 'rules' })).toEqual({
      stepSummary: 'Send invoices',
      verdict: 'rules',
    })
  })

  it('rejects 301 characters', () => {
    expect(validateArgue({ stepSummary: 'a'.repeat(301), verdict: 'rules' })).toBeNull()
  })

  it('accepts 300 characters', () => {
    expect(
      validateArgue({ stepSummary: 'a'.repeat(300), verdict: 'rules' }),
    ).not.toBeNull()
  })

  it('rejects an empty summary', () => {
    expect(validateArgue({ stepSummary: '  ', verdict: 'rules' })).toBeNull()
  })

  it('rejects an unknown verdict', () => {
    expect(validateArgue({ stepSummary: 'Send invoices', verdict: 'magic' })).toBeNull()
  })

  it('rejects an extra top-level key', () => {
    expect(
      validateArgue({ stepSummary: 'Send invoices', verdict: 'rules', extra: 1 }),
    ).toBeNull()
  })

  it('rejects non-objects', () => {
    expect(validateArgue(null)).toBeNull()
    expect(validateArgue('x')).toBeNull()
  })
})
