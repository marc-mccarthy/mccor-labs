import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { ownerEmailText, sendOwnerEmail } from './mail'

const ses = mockClient(SESv2Client)
const input = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+12025550123',
  company: '',
  budget: '$10k – $25k',
  message: 'We need a marketing site.',
}

beforeEach(() => {
  ses.reset()
})

describe('ownerEmailText', () => {
  it('lists every field and marks empty optional ones', () => {
    expect(ownerEmailText(input, 'AB12CD34')).toBe(
      [
        'Reference: AB12CD34',
        'Name: Ada Lovelace',
        'Email: ada@example.com',
        'Phone: +12025550123',
        'Company: (not given)',
        'Budget: $10k – $25k',
        '',
        'We need a marketing site.',
      ].join('\n'),
    )
  })

  it('marks a missing phone as not given', () => {
    expect(ownerEmailText({ ...input, phone: '' }, 'AB12CD34')).toContain(
      'Phone: (not given)',
    )
  })
})

describe('sendOwnerEmail', () => {
  it('sends one plain-text email to the owner with the visitor as reply-to', async () => {
    ses.on(SendEmailCommand).resolves({ MessageId: 'm-1' })
    await sendOwnerEmail(new SESv2Client({ region: 'us-east-1' }), {
      from: 'website@mccorlabs.com',
      to: 'owner@mccorlabs.com',
      reference: 'AB12CD34',
      input,
    })
    const sent = ses.commandCalls(SendEmailCommand)
    expect(sent).toHaveLength(1)
    const request = sent[0]?.args[0].input
    expect(request?.FromEmailAddress).toBe('website@mccorlabs.com')
    expect(request?.Destination).toEqual({ ToAddresses: ['owner@mccorlabs.com'] })
    expect(request?.ReplyToAddresses).toEqual(['ada@example.com'])
    expect(request?.Content?.Simple?.Subject?.Data).toBe('Website enquiry AB12CD34')
    expect(request?.Content?.Simple?.Body?.Text?.Data).toBe(
      ownerEmailText(input, 'AB12CD34'),
    )
    expect(request?.Content?.Simple?.Body?.Html).toBeUndefined()
  })

  it('propagates an SES failure', async () => {
    ses.on(SendEmailCommand).rejects(new Error('MessageRejected'))
    await expect(
      sendOwnerEmail(new SESv2Client({ region: 'us-east-1' }), {
        from: 'website@mccorlabs.com',
        to: 'owner@mccorlabs.com',
        reference: 'AB12CD34',
        input,
      }),
    ).rejects.toThrow('MessageRejected')
  })
})
