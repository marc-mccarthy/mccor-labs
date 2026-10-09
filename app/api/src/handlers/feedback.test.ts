import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LambdaFunctionURLEvent } from '../lib/http'
import { createFeedbackHandler } from './feedback'

const ddb = mockClient(DynamoDBDocumentClient)
const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const now = new Date('2026-10-09T12:00:00Z')
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

function setup(ok = true) {
  const takeUnit = vi
    .fn()
    .mockResolvedValue({ ok, used: ok ? 1 : 500, remaining: ok ? 499 : 0 })
  const handler = createFeedbackHandler({
    client,
    table: 'mccorlabs-lab',
    cap: 500,
    now: () => now,
    newId: () => '01TEST',
    takeUnit,
  })
  return { handler, takeUnit }
}

beforeEach(() => ddb.reset())

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
    expect(put?.Item).toMatchObject({
      pk: 'mark#01TEST',
      verdictId: 'rules',
      ruleId: 'R8',
      rubricVersion: '2.0.0',
      reason: 'needs-less',
      expiresAt: 1791547200 + 90 * 86400,
    })
  })

  it('rejects when the write fails', async () => {
    ddb.on(PutCommand).rejects(new Error('ConditionalCheckFailed'))
    const { handler } = setup()
    await expect(handler(event('POST', body))).rejects.toThrow('ConditionalCheckFailed')
  })
})
