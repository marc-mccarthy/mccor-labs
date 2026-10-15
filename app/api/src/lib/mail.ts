import { SendEmailCommand, type SESv2Client } from '@aws-sdk/client-sesv2'
import type { ContactInput } from './contactInput'

export interface OwnerEmail {
  from: string
  to: string
  reference: string
  input: ContactInput
}

function orNotGiven(value: string): string {
  return value === '' ? '(not given)' : value
}

export function ownerEmailText(input: ContactInput, reference: string): string {
  return [
    `Reference: ${reference}`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Phone: ${orNotGiven(input.phone)}`,
    `Company: ${orNotGiven(input.company)}`,
    `Budget: ${orNotGiven(input.budget)}`,
    '',
    input.message,
  ].join('\n')
}

export async function sendOwnerEmail(
  client: SESv2Client,
  email: OwnerEmail,
): Promise<void> {
  await client.send(
    new SendEmailCommand({
      FromEmailAddress: email.from,
      Destination: { ToAddresses: [email.to] },
      ReplyToAddresses: [email.input.email],
      Content: {
        Simple: {
          Subject: { Data: `Website enquiry ${email.reference}`, Charset: 'UTF-8' },
          Body: {
            Text: {
              Data: ownerEmailText(email.input, email.reference),
              Charset: 'UTF-8',
            },
          },
        },
      },
    }),
  )
}
