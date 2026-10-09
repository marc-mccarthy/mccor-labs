import { randomUUID } from 'node:crypto'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { SESv2Client } from '@aws-sdk/client-sesv2'
import { checkContact } from '../lib/contactInput'
import { takeUnit } from '../lib/counter'
import {
  json,
  parseJsonBody,
  type LambdaFunctionURLEvent,
  type LambdaFunctionURLResult,
} from '../lib/http'
import { sendOwnerEmail } from '../lib/mail'

const MAX_BODY_BYTES = 32_768
const COUNTER_TTL_DAYS = 7

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const sesClient = new SESv2Client({})

export interface ContactConfig {
  table: string
  dailyCap: number
  from: string
  to: string
}

function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]
  if (value === undefined || value === '') throw new Error(`${name} is not set`)
  return value
}

export function readConfig(env: NodeJS.ProcessEnv): ContactConfig {
  const dailyCap = Number(requireEnv(env, 'CONTACT_DAILY_CAP'))
  if (!Number.isInteger(dailyCap) || dailyCap < 1) {
    throw new Error('CONTACT_DAILY_CAP must be a positive integer')
  }
  return {
    table: requireEnv(env, 'TABLE_NAME'),
    dailyCap,
    from: requireEnv(env, 'CONTACT_FROM'),
    to: requireEnv(env, 'CONTACT_TO'),
  }
}

function counterKey(now: Date): string {
  return `contact#${now.toISOString().slice(0, 10)}`
}

function newReference(): string {
  return randomUUID().slice(0, 8).toUpperCase()
}

function log(fields: Record<string, string | number>): void {
  console.info(JSON.stringify(fields))
}

export async function handler(
  event: LambdaFunctionURLEvent,
): Promise<LambdaFunctionURLResult> {
  if (event.requestContext.http.method !== 'POST') return json(405, { reason: 'method' })

  const check = checkContact(parseJsonBody<unknown>(event, MAX_BODY_BYTES))
  if (check.kind === 'spam') {
    log({ outcome: 'spam' })
    return json(200, { ok: true, reference: newReference() })
  }
  if (check.kind === 'invalid') {
    log({ outcome: check.reason })
    return json(400, { reason: check.reason })
  }

  try {
    const config = readConfig(process.env)
    const now = new Date()
    const unit = await takeUnit({
      client: documentClient,
      table: config.table,
      key: counterKey(now),
      cap: config.dailyCap,
      ttlDays: COUNTER_TTL_DAYS,
      now,
    })
    if (!unit.ok) {
      log({ outcome: 'daily_cap' })
      return json(429, { reason: 'daily_cap' })
    }
    const reference = newReference()
    await sendOwnerEmail(sesClient, {
      from: config.from,
      to: config.to,
      reference,
      input: check.value,
    })
    log({ outcome: 'sent', reference, used: unit.used })
    return json(200, { ok: true, reference })
  } catch (error) {
    log({ outcome: 'error', error: error instanceof Error ? error.name : 'unknown' })
    return json(500, { reason: 'server' })
  }
}
