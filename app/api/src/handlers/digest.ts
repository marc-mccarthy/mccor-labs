import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { formatDigest } from '../lib/digestEmail'
import { aggregateMarks, queryMarks as realQueryMarks } from '../lib/digestQuery'

const WEEK_MS = 7 * 86400 * 1000

interface DigestDeps {
  client: DynamoDBDocumentClient
  ses: SESv2Client
  table: string
  from: string
  to: string
  now: () => Date
  queryMarks: typeof realQueryMarks
}

export function createDigestHandler(deps: DigestDeps) {
  return async (): Promise<{ total: number }> => {
    const until = deps.now()
    const since = new Date(until.getTime() - WEEK_MS)
    const counts = aggregateMarks(
      await deps.queryMarks({ client: deps.client, table: deps.table, since }),
    )
    const { subject, text } = formatDigest({ counts, since, until })
    await deps.ses.send(
      new SendEmailCommand({
        FromEmailAddress: deps.from,
        Destination: { ToAddresses: [deps.to] },
        Content: {
          Simple: { Subject: { Data: subject }, Body: { Text: { Data: text } } },
        },
      }),
    )
    return { total: counts.reduce((sum, c) => sum + c.count, 0) }
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

let live: ReturnType<typeof createDigestHandler> | undefined

export function handler(): Promise<{ total: number }> {
  live ??= createDigestHandler({
    client: DynamoDBDocumentClient.from(new DynamoDBClient({})),
    ses: new SESv2Client({}),
    table: requiredEnv('TABLE_NAME'),
    from: requiredEnv('DIGEST_FROM'),
    to: requiredEnv('DIGEST_TO'),
    now: () => new Date(),
    queryMarks: realQueryMarks,
  })
  return live()
}
