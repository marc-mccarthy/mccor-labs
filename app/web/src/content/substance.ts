export interface CodeSample {
  code: string
  lang: string
  filename: string
}

export const codeSamples: Readonly<Record<string, CodeSample>> = {
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
import { answer } from '../src/answer'
import { BASELINE, score } from './score'
import { refundPolicy } from './cases/refund-policy'

it('answers from the retrieved context, not from memory', async () => {
  const result = await answer(refundPolicy.question, refundPolicy.documents)
  expect(result.citations).not.toHaveLength(0)
  expect(score(result.text, refundPolicy.expected)).toBeGreaterThanOrEqual(BASELINE)
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
    'A retrieval pipeline: ingestion, chunking, embedding, vector store, hybrid retrieval, reranking, evaluation.',
  stages: [
    'Ingestion',
    'Chunking',
    'Embedding',
    'Vector store',
    'Hybrid retrieval',
    'Reranking',
    'Evaluation',
  ],
}

export interface IntegrationSample {
  surfaces: readonly string[]
  description: string
}

export const integrationSurfaces: IntegrationSample = {
  description:
    'An LLM feature reaching four named systems, CRM, ticketing, data warehouse and records database, only through one explicit permission boundary.',
  surfaces: ['CRM', 'Ticketing', 'Data warehouse', 'Records DB'],
}

export interface TerminalSampleLine {
  kind: 'command' | 'output'
  text: string
}

export const terminalSamples: Readonly<Record<string, readonly TerminalSampleLine[]>> = {
  'static-export-build': [
    {
      kind: 'command',
      text: 'op run --env-file=app/web/.env.template -- pnpm -F web build',
    },
    { kind: 'output', text: '▲ Next.js 16.3.6 (Turbopack)' },
    { kind: 'output', text: 'Route (app)' },
    { kind: 'output', text: '┌ ○ /' },
    { kind: 'output', text: '├ ○ /services' },
    { kind: 'output', text: '└ ○ /work' },
    { kind: 'output', text: '○  (Static)  prerendered as static content' },
  ],
}

export const toolsWeBuildWith = {
  heading: 'Tools we build with',
  tools: ['AWS', 'Postgres', 'Next.js', 'Anthropic', 'OpenAI', 'Terraform'],
} as const
