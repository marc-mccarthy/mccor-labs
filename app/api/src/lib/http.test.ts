import { describe, expect, it } from 'vitest'
import { json, parseJsonBody, type LambdaFunctionURLEvent } from './http'

function event(
  body: string | undefined,
  isBase64Encoded = false,
): LambdaFunctionURLEvent {
  return { body, isBase64Encoded, requestContext: { http: { method: 'POST' } } }
}

describe('json', () => {
  it('serialises the body with a JSON content type and no caching', () => {
    expect(json(429, { reason: 'daily_cap' })).toEqual({
      statusCode: 429,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      body: '{"reason":"daily_cap"}',
    })
  })
})

describe('parseJsonBody', () => {
  it('parses a plain JSON body', () => {
    expect(parseJsonBody(event('{"a":1}'), 100)).toEqual({ a: 1 })
  })

  it('decodes a base64 body first', () => {
    const encoded = Buffer.from('{"a":1}', 'utf8').toString('base64')
    expect(parseJsonBody(event(encoded, true), 100)).toEqual({ a: 1 })
  })

  it('returns null for a missing body', () => {
    expect(parseJsonBody(event(undefined), 100)).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    expect(parseJsonBody(event('{"a":'), 100)).toBeNull()
  })

  it('returns null when the body is over the byte limit', () => {
    expect(parseJsonBody(event(JSON.stringify({ a: 'é'.repeat(10) })), 20)).toBeNull()
  })
})
