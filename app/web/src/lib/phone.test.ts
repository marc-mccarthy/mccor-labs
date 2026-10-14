import { describe, expect, it } from 'vitest'
import { formatPhoneDigits, isValidUsPhone, phoneDigits, toE164 } from './phone'

const CASES: readonly (readonly [string, string, boolean])[] = [
  ['valid E.164', '+12025550123', true],
  ['bare ten digits', '2025550123', true],
  ['spaced with country code', '+1 202 555 0123', true],
  ['formatted with country code', '+1 (202) 555-0123', true],
  ['dashed with leading 1', '1-202-555-0123', true],
  ['formatted', '(202) 555-0123', true],
  ['area code starting with 1', '+11025550123', false],
  ['exchange starting with 1', '+12021550123', false],
  ['format-only example', '5551234567', false],
  ['too short', '202555012', false],
  ['too long', '20255501234', false],
  ['letters', 'abcdefghij', false],
  ['empty', '', false],
]

describe('isValidUsPhone', () => {
  it.each(CASES)('%s: %s', (_label, raw, valid) => {
    expect(isValidUsPhone(raw)).toBe(valid)
  })
})

describe('phoneDigits', () => {
  it('strips every non-digit', () => {
    expect(phoneDigits('(202) 555-0123')).toBe('2025550123')
  })

  it('drops one leading 1', () => {
    expect(phoneDigits('+1 202 555 0123')).toBe('2025550123')
    expect(phoneDigits('1')).toBe('')
    expect(phoneDigits('11')).toBe('1')
  })

  it('caps at ten digits', () => {
    expect(phoneDigits('202555012399')).toBe('2025550123')
  })

  it('returns an empty string for letters', () => {
    expect(phoneDigits('abc')).toBe('')
  })
})

describe('formatPhoneDigits', () => {
  it.each([
    ['', ''],
    ['202', '202'],
    ['2025', '(202) 5'],
    ['1255501', '(125) 550-1'],
    ['1234567890', '(123) 456-7890'],
    ['12345678901', '(123) 456-7890'],
  ])('formats %j as %j without dropping a leading 1', (digits, formatted) => {
    expect(formatPhoneDigits(digits)).toBe(formatted)
  })

  it('never emits a trailing separator', () => {
    for (let length = 0; length <= 10; length++) {
      expect(formatPhoneDigits('2025550123'.slice(0, length))).toMatch(/\d$|^$/)
    }
  })
})

describe('toE164', () => {
  it.each(['(202) 555-0123', '2025550123', '+1 202 555 0123', '1-202-555-0123'])(
    'normalises %s',
    (raw) => {
      expect(toE164(raw)).toBe('+12025550123')
    },
  )
})
