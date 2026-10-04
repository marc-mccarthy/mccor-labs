'use client'

import dynamic from 'next/dynamic'
import { useRef } from 'react'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { useScrollProgress } from '@/components/motion/useScrollProgress'
import { SectionHeading } from '@/components/ui/section-heading'
import { PipelineDiagram } from '@/components/substance/PipelineDiagram'
import { retrievalPipeline } from '@/content/substance'
import { ui } from '@/content/ui'

const Pipeline3D = dynamic(
  () => import('@/components/effects/Pipeline3D').then((module) => module.Pipeline3D),
  { ssr: false },
)

export function PipelineSection() {
  const ref = useRef<HTMLDivElement>(null)
  const progress = useScrollProgress(ref)

  return (
    <Section>
      <div ref={ref} className="relative flex min-h-96 items-center">
        <Pipeline3D
          stages={retrievalPipeline.stages}
          progress={progress}
          className="pointer-events-none absolute inset-0"
        />
        <Container className="relative z-10">
          <SectionHeading className="mb-8">{ui.pipelineHeading}</SectionHeading>
          <PipelineDiagram {...retrievalPipeline} />
        </Container>
      </div>
    </Section>
  )
}
