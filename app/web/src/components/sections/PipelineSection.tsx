'use client'

import dynamic from 'next/dynamic'
import { motionScene } from '@/components/motion/motionScene'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { GlowField } from '@/components/ui/glow-field'
import { SectionHeading } from '@/components/ui/section-heading'
import { PipelineDiagram } from '@/components/substance/PipelineDiagram'
import { retrievalPipeline } from '@/content/substance'
import { ui } from '@/content/ui'

const Pipeline3D = motionScene(
  dynamic(
    () => import('@/components/effects/Pipeline3D').then((module) => module.Pipeline3D),
    { ssr: false },
  ),
)

export function PipelineSection() {
  return (
    <Section className="relative isolate">
      <GlowField anchor="center" />
      <Container>
        <SectionHeading
          className="mb-8"
          size="md"
          words
          eyebrow={{ index: '03', label: ui.eyebrows.retrieval }}
        >
          {ui.pipelineHeading}
        </SectionHeading>
        <div className="relative">
          <Pipeline3D
            stages={retrievalPipeline.stages}
            className="pointer-events-none absolute inset-0 max-sm:hidden"
          />
          <PipelineDiagram {...retrievalPipeline} />
        </div>
      </Container>
    </Section>
  )
}
