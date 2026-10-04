import type { ReactNode } from 'react'
import { CodeBlock } from '@/components/substance/CodeBlock'
import { IntegrationDiagram } from '@/components/substance/IntegrationDiagram'
import { PipelineDiagram } from '@/components/substance/PipelineDiagram'
import { Terminal } from '@/components/substance/Terminal'
import { WorkflowDiagram } from '@/components/substance/WorkflowDiagram'
import type { Capability } from '@/content/types'
import {
  codeSamples,
  integrationSurfaces,
  retrievalPipeline,
  terminalSamples,
  workflowApprovalGate,
} from '@/content/substance'

const diagrams: Readonly<Record<string, () => ReactNode>> = {
  'integration-surfaces': () => <IntegrationDiagram {...integrationSurfaces} />,
  'workflow-approval-gate': () => <WorkflowDiagram {...workflowApprovalGate} />,
  'retrieval-pipeline': () => <PipelineDiagram {...retrievalPipeline} />,
}

async function renderSubstance({
  kind,
  ref,
}: Capability['substance']): Promise<ReactNode> {
  if (kind === 'code') {
    const sample = codeSamples[ref]
    if (!sample) throw new Error(`Unknown code ref: ${ref}`)
    return <CodeBlock {...sample} />
  }
  if (kind === 'terminal') {
    const lines = terminalSamples[ref]
    if (!lines) throw new Error(`Unknown terminal ref: ${ref}`)
    return <Terminal lines={lines} />
  }
  const diagram = diagrams[ref]
  if (!diagram) throw new Error(`Unknown diagram ref: ${ref}`)
  return diagram()
}

export async function CapabilityBlock({ capability }: { capability: Capability }) {
  const substance = await renderSubstance(capability.substance)

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xl font-semibold text-text">{capability.title}</h3>
      <p className="max-w-2xl text-muted">{capability.summary}</p>
      {substance}
    </div>
  )
}
