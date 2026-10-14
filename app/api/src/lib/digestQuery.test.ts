import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { aggregateMarks, queryMarks } from './digestQuery'

const ddb = mockClient(DynamoDBDocumentClient)
const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const since = new Date('2026-10-02T13:00:00Z')

beforeEach(() => ddb.reset())

describe('queryMarks', () => {
  it('queries the marks index by kind and window and follows pages', async () => {
    ddb
      .on(QueryCommand)
      .resolvesOnce({
        Items: [
          {
            ruleId: 'R4',
            verdictId: 'rules',
            reason: 'needs-less',
            rubricVersion: '1.0.0',
          },
        ],
        LastEvaluatedKey: {
          pk: 'mark#A',
          kind: 'mark',
          createdAt: '2026-10-03T00:00:00.000Z',
        },
      })
      .resolvesOnce({
        Items: [
          {
            ruleId: 'R13',
            verdictId: 'unclear',
            reason: 'questions-missed',
            rubricVersion: '1.0.0',
          },
        ],
      })
    const records = await queryMarks({ client, table: 'mccorlabs-lab', since })
    expect(records).toHaveLength(2)
    const calls = ddb.commandCalls(QueryCommand)
    expect(calls).toHaveLength(2)
    const first = calls[0]?.args[0].input
    expect(first).toMatchObject({
      TableName: 'mccorlabs-lab',
      IndexName: 'marks',
      KeyConditionExpression: '#k = :mark AND createdAt >= :since',
      ProjectionExpression: '#rule, #v, #r, #rv',
      ExpressionAttributeNames: {
        '#k': 'kind',
        '#rule': 'ruleId',
        '#v': 'verdictId',
        '#r': 'reason',
        '#rv': 'rubricVersion',
      },
      ExpressionAttributeValues: {
        ':mark': 'mark',
        ':since': '2026-10-02T13:00:00.000Z',
      },
    })
    expect(first?.FilterExpression).toBeUndefined()
    expect(first?.ExclusiveStartKey).toBeUndefined()
    expect(calls[1]?.args[0].input).toMatchObject({ IndexName: 'marks' })
    expect(calls[1]?.args[0].input.ExclusiveStartKey).toEqual({
      pk: 'mark#A',
      kind: 'mark',
      createdAt: '2026-10-03T00:00:00.000Z',
    })
  })

  it('throws on a malformed mark instead of skipping it', async () => {
    ddb.on(QueryCommand).resolves({
      Items: [{ verdictId: 'rules', reason: 'needs-less', rubricVersion: '1.0.0' }],
    })
    await expect(queryMarks({ client, table: 't', since })).rejects.toThrow(
      'malformed mark',
    )
  })
})

describe('aggregateMarks', () => {
  it('counts per rule, verdict, reason and version, highest first, then by name', () => {
    const r = (
      ruleId: string,
      verdictId: string,
      reason: string,
      rubricVersion = '1.0.0',
    ) => ({ ruleId, verdictId, reason, rubricVersion })
    expect(
      aggregateMarks([
        r('R4', 'rules', 'needs-less'),
        r('R13', 'unclear', 'needs-more'),
        r('R4', 'rules', 'needs-less'),
        r('R5', 'rules', 'needs-less'),
        r('R7', 'classic-ml', 'needs-more'),
        r('R4', 'rules', 'needs-less', '1.1.0'),
      ]),
    ).toEqual([
      {
        ruleId: 'R4',
        verdictId: 'rules',
        reason: 'needs-less',
        rubricVersion: '1.0.0',
        count: 2,
      },
      {
        ruleId: 'R13',
        verdictId: 'unclear',
        reason: 'needs-more',
        rubricVersion: '1.0.0',
        count: 1,
      },
      {
        ruleId: 'R4',
        verdictId: 'rules',
        reason: 'needs-less',
        rubricVersion: '1.1.0',
        count: 1,
      },
      {
        ruleId: 'R5',
        verdictId: 'rules',
        reason: 'needs-less',
        rubricVersion: '1.0.0',
        count: 1,
      },
      {
        ruleId: 'R7',
        verdictId: 'classic-ml',
        reason: 'needs-more',
        rubricVersion: '1.0.0',
        count: 1,
      },
    ])
  })

  it('returns an empty list for no marks', () => {
    expect(aggregateMarks([])).toEqual([])
  })
})
