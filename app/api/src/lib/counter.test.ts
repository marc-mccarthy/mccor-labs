import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { takeUnit } from './counter'

const ddb = mockClient(DynamoDBDocumentClient)
const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }))
const now = new Date('2026-10-09T12:00:00Z')
const params = {
  client,
  table: 'mccorlabs-lab',
  key: 'contact#2026-10-09',
  cap: 50,
  ttlDays: 7,
  now,
}

beforeEach(() => {
  ddb.reset()
})

describe('takeUnit', () => {
  it('takes a unit and reports what is left', async () => {
    ddb.on(UpdateCommand).resolves({ Attributes: { used: 3 } })
    expect(await takeUnit(params)).toEqual({ ok: true, used: 3, remaining: 47 })
  })

  it('sends one conditional update capped below the limit with a 7-day expiry', async () => {
    ddb.on(UpdateCommand).resolves({ Attributes: { used: 1 } })
    await takeUnit(params)
    const input = ddb.commandCalls(UpdateCommand)[0]?.args[0].input
    expect(input?.TableName).toBe('mccorlabs-lab')
    expect(input?.Key).toEqual({ pk: 'contact#2026-10-09' })
    expect(input?.ConditionExpression).toBe('attribute_not_exists(#used) OR #used < :cap')
    expect(input?.ExpressionAttributeValues).toEqual({
      ':one': 1,
      ':cap': 50,
      ':expiresAt': Math.floor(now.getTime() / 1000) + 7 * 86_400,
    })
  })

  it('refuses when the cap is reached', async () => {
    ddb
      .on(UpdateCommand)
      .rejects(new ConditionalCheckFailedException({ message: 'full', $metadata: {} }))
    expect(await takeUnit(params)).toEqual({ ok: false, used: 50, remaining: 0 })
  })

  it('rethrows any other failure', async () => {
    ddb.on(UpdateCommand).rejects(new Error('throttled'))
    await expect(takeUnit(params)).rejects.toThrow('throttled')
  })
})
