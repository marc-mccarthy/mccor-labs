import { type DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'

export interface MarkRecord {
  ruleId: string
  verdictId: string
  reason: string
  rubricVersion: string
}

export interface MarkCount extends MarkRecord {
  count: number
}

interface ScanInput {
  client: DynamoDBDocumentClient
  table: string
  since: Date
}

function toMarkRecord(item: Record<string, unknown>): MarkRecord {
  const { ruleId, verdictId, reason, rubricVersion } = item
  if (
    typeof ruleId !== 'string' ||
    typeof verdictId !== 'string' ||
    typeof reason !== 'string' ||
    typeof rubricVersion !== 'string'
  ) {
    throw new Error(`malformed mark: ${JSON.stringify(Object.keys(item))}`)
  }
  return { ruleId, verdictId, reason, rubricVersion }
}

export async function scanMarks({
  client,
  table,
  since,
}: ScanInput): Promise<MarkRecord[]> {
  const records: MarkRecord[] = []
  let startKey: Record<string, unknown> | undefined
  do {
    const page = await client.send(
      new ScanCommand({
        TableName: table,
        FilterExpression: 'begins_with(pk, :mark) AND createdAt >= :since',
        ProjectionExpression: '#rule, #v, #r, #rv',
        ExpressionAttributeNames: {
          '#rule': 'ruleId',
          '#v': 'verdictId',
          '#r': 'reason',
          '#rv': 'rubricVersion',
        },
        ExpressionAttributeValues: { ':mark': 'mark#', ':since': since.toISOString() },
        ExclusiveStartKey: startKey,
      }),
    )
    records.push(...(page.Items ?? []).map(toMarkRecord))
    startKey = page.LastEvaluatedKey
  } while (startKey)
  return records
}

function byCountThenName(a: MarkCount, b: MarkCount): number {
  return (
    b.count - a.count ||
    a.ruleId.localeCompare(b.ruleId) ||
    a.verdictId.localeCompare(b.verdictId) ||
    a.reason.localeCompare(b.reason) ||
    a.rubricVersion.localeCompare(b.rubricVersion)
  )
}

export function aggregateMarks(records: readonly MarkRecord[]): MarkCount[] {
  const counts = new Map<string, MarkCount>()
  for (const record of records) {
    const key = [
      record.ruleId,
      record.verdictId,
      record.reason,
      record.rubricVersion,
    ].join('\u0000')
    const current = counts.get(key)
    counts.set(key, { ...record, count: (current?.count ?? 0) + 1 })
  }
  return [...counts.values()].sort(byCountThenName)
}
