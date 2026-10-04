'use client'

import dynamic from 'next/dynamic'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { SectionHeading } from '@/components/ui/section-heading'
import { PipelineDiagram } from '@/components/substance/PipelineDiagram'
import { retrievalPipeline } from '@/content/substance'
import { ui } from '@/content/ui'

const Pipeline3D = dynamic(
  () => import('@/components/effects/Pipeline3D').then((module) => module.Pipeline3D),
  { ssr: false },
)

export function PipelineSection() {
  return (
    <Section>
      <div className="relative flex min-h-96 items-center">
        <Container className="relative z-10">
          <SectionHeading className="mb-8">{ui.pipelineHeading}</SectionHeading>
          <div className="relative">
            <Pipeline3D
              stages={retrievalPipeline.stages}
              className="pointer-events-none absolute inset-0 max-sm:hidden"
            />
            <PipelineDiagram {...retrievalPipeline} />
          </div>
        </Container>
      </div>
    </Section>
  )
}
