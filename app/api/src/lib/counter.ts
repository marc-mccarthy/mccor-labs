import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import { UpdateCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const DAY_SECONDS = 86_400

export interface TakeUnitParams {
  client: DynamoDBDocumentClient
  table: string
  key: string
  cap: number
  ttlDays: number
  now: Date
}

export interface TakeUnitResult {
  ok: boolean
  used: number
  remaining: number
}

export async function takeUnit(params: TakeUnitParams): Promise<TakeUnitResult> {
  const { client, table, key, cap, ttlDays, now } = params
  const expiresAt = Math.floor(now.getTime() / 1000) + ttlDays * DAY_SECONDS
  try {
    const result = await client.send(
      new UpdateCommand({
        TableName: table,
        Key: { pk: key },
        UpdateExpression:
          'SET #expiresAt = if_not_exists(#expiresAt, :expiresAt) ADD #used :one',
        ConditionExpression: 'attribute_not_exists(#used) OR #used < :cap',
        ExpressionAttributeNames: { '#used': 'used', '#expiresAt': 'expiresAt' },
        ExpressionAttributeValues: { ':one': 1, ':cap': cap, ':expiresAt': expiresAt },
        ReturnValues: 'UPDATED_NEW',
      }),
    )
    const used = Number(result.Attributes?.used ?? 0)
    return { ok: true, used, remaining: Math.max(cap - used, 0) }
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return { ok: false, used: cap, remaining: 0 }
    }
    throw error
  }
}
