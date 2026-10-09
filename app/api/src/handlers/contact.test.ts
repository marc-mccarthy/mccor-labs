import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2'
import { mockClient } from 'aws-sdk-client-mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LambdaFunctionURLEvent } from '../lib/http'
import { handler } from './contact'

const ddb = mockClient(DynamoDBDocumentClient)
const ses = mockClient(SESv2Client)

const form = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Engines',
  budget: '',
  message: 'We need a marketing site and a client portal.',
  honeypot: '',
  elapsedMs: 5000,
}

function post(body: unknown, method = 'POST'): LambdaFunctionURLEvent {
  return {
    body: JSON.stringify(body),
    isBase64Encoded: false,
    requestContext: { http: { method } },
  }
}

beforeEach(() => {
  ddb.reset()
  ses.reset()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-09T23:59:00Z'))
  vi.stubEnv('TABLE_NAME', 'mccorlabs-lab')
  vi.stubEnv('CONTACT_DAILY_CAP', '50')
  vi.stubEnv('CONTACT_FROM', 'website@mccorlabs.com')
  vi.stubEnv('CONTACT_TO', 'owner@mccorlabs.com')
  vi.spyOn(console, 'info').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('contact handler', () => {
  it('refuses methods other than POST', async () => {
    expect((await handler(post(form, 'GET'))).statusCode).toBe(405)
  })

  it('returns 400 validation for malformed JSON', async () => {
    const result = await handler({ ...post(form), body: '{"name":' })
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body)).toEqual({ reason: 'validation' })
  })

  it('answers a filled honeypot with 200 and touches nothing', async () => {
    const result = await handler(post({ ...form, honeypot: 'bot' }))
    expect(result.statusCode).toBe(200)
    expect(ddb.commandCalls(UpdateCommand)).toHaveLength(0)
    expect(ses.commandCalls(SendEmailCommand)).toHaveLength(0)
  })

  it('returns 400 too_fast for a form sent in under 3 seconds', async () => {
    const result = await handler(post({ ...form, elapsedMs: 800 }))
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body)).toEqual({ reason: 'too_fast' })
    expect(ddb.commandCalls(UpdateCommand)).toHaveLength(0)
  })

  it('counts against the UTC day, emails the owner and returns a reference', async () => {
    ddb.on(UpdateCommand).resolves({ Attributes: { used: 1 } })
    ses.on(SendEmailCommand).resolves({ MessageId: 'm-1' })
    const result = await handler(post(form))
    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body) as { ok: boolean; reference: string }
    expect(body.ok).toBe(true)
    expect(body.reference).toMatch(/^[0-9A-F]{8}$/)
    expect(ddb.commandCalls(UpdateCommand)[0]?.args[0].input.Key).toEqual({
      pk: 'contact#2026-10-09',
    })
    expect(ses.commandCalls(SendEmailCommand)[0]?.args[0].input.Destination).toEqual({
      ToAddresses: ['owner@mccorlabs.com'],
    })
  })

  it('returns 429 daily_cap at the cap and sends no email', async () => {
    ddb
      .on(UpdateCommand)
      .rejects(new ConditionalCheckFailedException({ message: 'full', $metadata: {} }))
    const result = await handler(post(form))
    expect(result.statusCode).toBe(429)
    expect(JSON.parse(result.body)).toEqual({ reason: 'daily_cap' })
    expect(ses.commandCalls(SendEmailCommand)).toHaveLength(0)
  })

  it('returns 500 when SES fails', async () => {
    ddb.on(UpdateCommand).resolves({ Attributes: { used: 1 } })
    ses.on(SendEmailCommand).rejects(new Error('MessageRejected'))
    const result = await handler(post(form))
    expect(result.statusCode).toBe(500)
    expect(JSON.parse(result.body)).toEqual({ reason: 'server' })
  })

  it('returns 500 when configuration is missing', async () => {
    vi.stubEnv('CONTACT_TO', '')
    expect((await handler(post(form))).statusCode).toBe(500)
  })

  it('never logs the visitor fields', async () => {
    ddb.on(UpdateCommand).resolves({ Attributes: { used: 1 } })
    ses.on(SendEmailCommand).resolves({ MessageId: 'm-1' })
    await handler(post(form))
    const logged = vi.mocked(console.info).mock.calls.flat().join(' ')
    for (const value of [form.name, form.email, form.company, form.message]) {
      expect(logged).not.toContain(value)
    }
  })
})
