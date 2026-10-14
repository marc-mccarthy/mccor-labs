import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { mockClient } from 'aws-sdk-client-mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LambdaFunctionURLEvent } from '../lib/http'
import { createFeedbackHandler } from './feedback'

const ddb = mockClient(DynamoDBDocumentClient)
const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const now = new Date('2026-10-09T23:30:00Z')
const body = JSON.stringify({
  verdictId: 'rules',
  ruleId: 'R8',
  rubricVersion: '2.0.0',
  reason: 'needs-less',
})

function event(method: string, raw: string): LambdaFunctionURLEvent {
  return {
    body: raw,
    isBase64Encoded: false,
    headers: { 'content-type': 'application/json' },
    requestContext: { http: { method } },
  } as unknown as LambdaFunctionURLEvent
}

function setup(ok = true, at = now) {
  const takeUnit = vi
    .fn()
    .mockResolvedValue({ ok, used: ok ? 1 : 500, remaining: ok ? 499 : 0 })
  const handler = createFeedbackHandler({
    client,
    table: 'mccorlabs-lab',
    cap: 500,
    now: () => at,
    newId: () => '01TEST',
    takeUnit,
  })
  return { handler, takeUnit }
}

beforeEach(() => {
  ddb.reset()
  vi.spyOn(console, 'info').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('feedback handler', () => {
  it('rejects non-POST with 405', async () => {
    const { handler, takeUnit } = setup()
    expect(await handler(event('GET', body))).toMatchObject({ statusCode: 405 })
    expect(takeUnit).not.toHaveBeenCalled()
  })

  it.each([
    [
      'bad enum',
      JSON.stringify({
        verdictId: 'x',
        ruleId: 'R4',
        rubricVersion: '1',
        reason: 'needs-less',
      }),
    ],
    [
      'unknown rule',
      JSON.stringify({
        verdictId: 'rules',
        ruleId: 'R99',
        rubricVersion: '1',
        reason: 'needs-less',
      }),
    ],
    ['not json', '{'],
    [
      'a valid body padded to 513 bytes',
      ' '.repeat(513 - Buffer.byteLength(body)) + body,
    ],
  ])('rejects %s with 400 before the counter', async (_, raw) => {
    const { handler, takeUnit } = setup()
    const result = await handler(event('POST', raw))
    expect(result).toMatchObject({ statusCode: 400 })
    expect(JSON.parse(result.body)).toEqual({
      reason: 'validation',
    })
    expect(takeUnit).not.toHaveBeenCalled()
    expect(ddb.commandCalls(PutCommand)).toHaveLength(0)
  })

  it('returns 429 daily_cap and writes nothing at the cap', async () => {
    const { handler } = setup(false)
    const result = await handler(event('POST', body))
    expect(result).toMatchObject({ statusCode: 429 })
    expect(JSON.parse(result.body)).toEqual({
      reason: 'daily_cap',
    })
    expect(ddb.commandCalls(PutCommand)).toHaveLength(0)
  })

  it('takes one unit on the UTC day key and writes one mark', async () => {
    ddb.on(PutCommand).resolves({})
    const { handler, takeUnit } = setup()
    expect(await handler(event('POST', body))).toMatchObject({ statusCode: 202 })
    expect(takeUnit).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'feedback#2026-10-09',
        cap: 500,
        ttlDays: 7,
        table: 'mccorlabs-lab',
        now,
      }),
    )
    const put = ddb.commandCalls(PutCommand)[0]?.args[0].input
    expect(put?.ConditionExpression).toBe('attribute_not_exists(pk)')
    expect(put?.Item).toEqual({
      pk: 'mark#01TEST',
      kind: 'mark',
      verdictId: 'rules',
      ruleId: 'R8',
      rubricVersion: '2.0.0',
      reason: 'needs-less',
      createdAt: '2026-10-09T23:30:00.000Z',
      expiresAt: 1791588600 + 90 * 86400,
    })
  })

  it('keys the counter on the UTC day just after midnight', async () => {
    ddb.on(PutCommand).resolves({})
    const at = new Date('2026-10-10T00:30:00Z')
    const { handler, takeUnit } = setup(true, at)
    await handler(event('POST', body))
    expect(takeUnit).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'feedback#2026-10-10', now: at }),
    )
  })

  it('rejects an unlisted rubric version with 400 before the counter', async () => {
    const { handler, takeUnit } = setup()
    const raw = JSON.stringify({ ...JSON.parse(body), rubricVersion: 'evil.example.com' })
    expect(await handler(event('POST', raw))).toMatchObject({ statusCode: 400 })
    expect(takeUnit).not.toHaveBeenCalled()
  })

  it('returns 500 server and logs only the error name when the write fails', async () => {
    ddb.on(PutCommand).rejects(new Error('ConditionalCheckFailed: secret'))
    const { handler } = setup()
    const result = await handler(event('POST', body))
    expect(result).toMatchObject({ statusCode: 500 })
    expect(JSON.parse(result.body)).toEqual({ reason: 'server' })
    expect(console.info).toHaveBeenCalledTimes(1)
    expect(console.info).toHaveBeenCalledWith(
      JSON.stringify({ outcome: 'error', error: 'Error' }),
    )
  })

  it('returns 500 server when the counter throws', async () => {
    const { handler, takeUnit } = setup()
    takeUnit.mockRejectedValue(new Error('boom'))
    const result = await handler(event('POST', body))
    expect(result).toMatchObject({ statusCode: 500 })
    expect(JSON.parse(result.body)).toEqual({ reason: 'server' })
    expect(ddb.commandCalls(PutCommand)).toHaveLength(0)
  })
})
