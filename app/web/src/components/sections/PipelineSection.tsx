'use client'

import dynamic from 'next/dynamic'
import { useCallback, useRef, useSyncExternalStore } from 'react'
import { motionScene } from '@/components/motion/motionScene'
import { useScrollProgressValue } from '@/components/motion/useScrollProgress'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { GlowField } from '@/components/ui/glow-field'
import { SectionHeading } from '@/components/ui/section-heading'
import { PipelineDiagram, stageIndexAt } from '@/components/substance/PipelineDiagram'
import { retrievalPipeline, retrievalStageDescriptors } from '@/content/substance'
import { ui } from '@/content/ui'

const Pipeline3D = motionScene(
  dynamic(
    () => import('@/components/effects/Pipeline3D').then((module) => module.Pipeline3D),
    { ssr: false },
  ),
)

type Progress = ReturnType<typeof useScrollProgressValue>

function serverStageIndex(): number {
  return -1
}

function useStageIndex(progress: Progress, count: number): number {
  const subscribe = useCallback(
    (onChange: () => void) => progress.on('change', onChange),
    [progress],
  )
  const getSnapshot = useCallback(
    () => stageIndexAt(progress.get(), count),
    [progress, count],
  )
  return useSyncExternalStore(subscribe, getSnapshot, serverStageIndex)
}

export function PipelineSection() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const progress = useScrollProgressValue(sectionRef)
  const activeIndex = useStageIndex(progress, retrievalPipeline.stages.length)

  return (
    <Section ref={sectionRef} className="relative isolate">
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
            progress={progress}
            className="pointer-events-none absolute inset-0 max-sm:hidden"
          />
          <PipelineDiagram
            {...retrievalPipeline}
            descriptors={retrievalStageDescriptors}
            activeIndex={activeIndex}
          />
        </div>
      </Container>
    </Section>
  )
}
