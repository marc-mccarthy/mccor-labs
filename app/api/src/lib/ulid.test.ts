import { describe, expect, it } from 'vitest'
import { ulid } from './ulid'

const zeros = (bytes: Uint8Array) => bytes.fill(0)

describe('ulid', () => {
  it('is 26 Crockford base32 characters', () => {
    expect(ulid(new Date('2026-10-09T00:00:00Z'))).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
  })

  it('encodes time first so ids sort by time', () => {
    const a = ulid(new Date('2026-10-09T00:00:00Z'), zeros)
    const b = ulid(new Date('2026-10-09T00:00:01Z'), zeros)
    expect(a < b).toBe(true)
    expect(a.slice(10)).toBe('0'.repeat(16))
  })

  it('encodes epoch zero as ten zeros', () => {
    expect(ulid(new Date(0), zeros)).toBe('0'.repeat(26))
  })

  it('throws on an invalid date', () => {
    expect(() => ulid(new Date('nope'))).toThrow('ulid needs a valid, non-negative time')
  })
})
