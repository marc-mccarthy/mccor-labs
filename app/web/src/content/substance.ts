export interface CodeSample {
  code: string
  lang: string
  filename: string
}

export const codeSamples: Readonly<Record<string, CodeSample>> = {
  'mcp-tool-definition': {
    filename: 'tools/lookup-record.ts',
    lang: 'typescript',
    code: `import { z } from 'zod'

export const lookupRecord = {
  name: 'lookup_record',
  description: 'Fetch one record by id from the system of record.',
  inputSchema: z.object({ id: z.string().min(1) }),
  async handler({ id }: { id: string }) {
    const record = await records.find(id)
    if (!record) throw new Error(\`No record with id \${id}\`)
    return { content: [{ type: 'text', text: JSON.stringify(record) }] }
  },
}`,
  },
  'mcp-server-transport': {
    filename: 'server.ts',
    lang: 'typescript',
    code: `import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

const server = new McpServer({ name: 'records', version: '1.0.0' })
const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })

await server.connect(transport)`,
  },
  'eval-assertion': {
    filename: 'evals/answers.eval.ts',
    lang: 'typescript',
    code: `import { expect, it } from 'vitest'

it('answers from the retrieved context, not from memory', async () => {
  const result = await answer(case.question, case.documents)
  expect(result.citations).not.toHaveLength(0)
  expect(score(result.text, case.expected)).toBeGreaterThanOrEqual(BASELINE)
})`,
  },
}

export interface WorkflowSample {
  steps: readonly { label: string; gate?: 'human' | 'cost' }[]
  description: string
}

export const workflowApprovalGate: WorkflowSample = {
  description:
    'An agent workflow: plan, draft, a cost gate, a human approval gate, then execute.',
  steps: [
    { label: 'Plan' },
    { label: 'Draft' },
    { label: 'Budget', gate: 'cost' },
    { label: 'Review', gate: 'human' },
    { label: 'Execute' },
  ],
}

export interface PipelineSample {
  stages: readonly string[]
  description: string
}

export const retrievalPipeline: PipelineSample = {
  description:
    'A retrieval pipeline: ingest, chunk, embed, hybrid retrieval, rerank, answer.',
  stages: ['Ingest', 'Chunk', 'Embed', 'Retrieve', 'Rerank', 'Answer'],
}
