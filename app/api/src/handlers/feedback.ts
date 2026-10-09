import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { takeUnit as realTakeUnit } from '../lib/counter'
import { FEEDBACK_MAX_BYTES, parseFeedback } from '../lib/feedbackInput'
import {
  json,
  parseJsonBody,
  type LambdaFunctionURLEvent,
  type LambdaFunctionURLResult,
} from '../lib/http'
import { toMarkItem } from '../lib/mark'
import { ulid } from '../lib/ulid'

interface FeedbackDeps {
  client: DynamoDBDocumentClient
  table: string
  cap: number
  now: () => Date
  newId: (now: Date) => string
  takeUnit: typeof realTakeUnit
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'unknown'
}

function log(fields: Record<string, string | number>): void {
  console.info(JSON.stringify(fields))
}

export function createFeedbackHandler(deps: FeedbackDeps) {
  return async (event: LambdaFunctionURLEvent): Promise<LambdaFunctionURLResult> => {
    if (event.requestContext.http.method !== 'POST')
      return json(405, { reason: 'method' })
    const feedback = parseFeedback(parseJsonBody<unknown>(event, FEEDBACK_MAX_BYTES))
    if (!feedback) return json(400, { reason: 'validation' })
    try {
      const now = deps.now()
      const unit = await deps.takeUnit({
        client: deps.client,
        table: deps.table,
        key: `feedback#${now.toISOString().slice(0, 10)}`,
        cap: deps.cap,
        ttlDays: 7,
        now,
      })
      if (!unit.ok) return json(429, { reason: 'daily_cap' })
      await deps.client.send(
        new PutCommand({
          TableName: deps.table,
          Item: toMarkItem(feedback, now, deps.newId(now)),
          ConditionExpression: 'attribute_not_exists(pk)',
        }),
      )
      return json(202, { ok: true })
    } catch (error) {
      log({ outcome: 'error', error: errorName(error) })
      return json(500, { reason: 'server' })
    }
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

function positiveInt(name: string, fallback: number): number {
  const raw = process.env[name]
  const value = raw === undefined ? fallback : Number(raw)
  if (!Number.isInteger(value) || value <= 0)
    throw new Error(`${name} must be a positive integer, received ${String(raw)}`)
  return value
}

let live: ReturnType<typeof createFeedbackHandler> | undefined

export function handler(event: LambdaFunctionURLEvent): Promise<LambdaFunctionURLResult> {
  live ??= createFeedbackHandler({
    client: DynamoDBDocumentClient.from(new DynamoDBClient({})),
    table: requiredEnv('TABLE_NAME'),
    cap: positiveInt('FEEDBACK_DAILY_CAP', 500),
    now: () => new Date(),
    newId: (now) => ulid(now),
    takeUnit: realTakeUnit,
  })
  return live(event)
}
