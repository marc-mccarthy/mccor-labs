import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MarkRecord } from '../lib/digestQuery'
import { createDigestHandler } from './digest'

const ses = mockClient(SESv2Client)
const now = new Date('2026-10-12T13:00:00Z')

beforeEach(() => ses.reset())

function setup(records: MarkRecord[]) {
  const scan = vi.fn().mockResolvedValue(records)
  const handler = createDigestHandler({
    client: DynamoDBDocumentClient.from(new DynamoDBClient({})),
    ses: new SESv2Client({}),
    table: 'mccorlabs-lab',
    from: 'lab@mccorlabs.com',
    to: 'owner@mccorlabs.com',
    now: () => now,
    scanMarks: scan,
  })
  return { handler, scan }
}

describe('digest handler', () => {
  it('scans the last 7 days and sends one plain-text email', async () => {
    ses.on(SendEmailCommand).resolves({ MessageId: 'm1' })
    const { handler, scan } = setup([
      { ruleId: 'R4', verdictId: 'rules', reason: 'needs-less', rubricVersion: '2.0.0' },
      { ruleId: 'R4', verdictId: 'rules', reason: 'needs-less', rubricVersion: '2.0.0' },
      { ruleId: 'R12', verdictId: 'rules', reason: 'needs-more', rubricVersion: '2.0.0' },
    ])
    expect(await handler()).toEqual({ total: 3 })
    expect(scan).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'mccorlabs-lab',
        since: new Date('2026-10-05T13:00:00Z'),
      }),
    )
    const input = ses.commandCalls(SendEmailCommand)[0]?.args[0].input
    expect(input?.FromEmailAddress).toBe('lab@mccorlabs.com')
    expect(input?.Destination?.ToAddresses).toEqual(['owner@mccorlabs.com'])
    expect(input?.Content?.Simple?.Subject?.Data).toBe(
      'Lab feedback: 3 marks, week to 2026-10-12',
    )
    const text = input?.Content?.Simple?.Body?.Text?.Data ?? ''
    expect(text).toMatch(/R4\s+rules\s+needs-less\s+2\.0\.0\s+2/)
    expect(text).toMatch(/R12\s+rules\s+needs-more\s+2\.0\.0\s+1/)
    expect(input?.Content?.Simple?.Body?.Html).toBeUndefined()
  })

  it('still sends when there are no marks', async () => {
    ses.on(SendEmailCommand).resolves({ MessageId: 'm2' })
    const { handler } = setup([])
    expect(await handler()).toEqual({ total: 0 })
    expect(ses.commandCalls(SendEmailCommand)).toHaveLength(1)
  })

  it('rejects with the SES error when SES fails', async () => {
    ses.on(SendEmailCommand).rejects(new Error('MessageRejected'))
    const { handler } = setup([])
    await expect(handler()).rejects.toThrow('MessageRejected')
  })
})
