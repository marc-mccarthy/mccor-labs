'use client'

import dynamic from 'next/dynamic'
import { useRef } from 'react'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Pinned } from '@/components/motion/Pinned'
import { useScrollProgress } from '@/components/motion/useScrollProgress'
import { ui } from '@/content/ui'

const NodeLatticeScene = dynamic(
  () =>
    import('@/components/effects/NodeLatticeScene').then(
      (module) => module.NodeLatticeScene,
    ),
  { ssr: false },
)

const PIN_HEIGHT = '200vh'

export function SystemsScene() {
  const ref = useRef<HTMLDivElement>(null)
  const progress = useScrollProgress(ref)

  return (
    <Section className="py-0 sm:py-0">
      <div ref={ref}>
        <Pinned height={PIN_HEIGHT}>
          <div className="relative flex h-screen items-center overflow-hidden bg-base">
            <NodeLatticeScene
              progress={progress}
              className="pointer-events-none absolute inset-0 z-5"
            />
            <Container className="relative z-10">
              <h2 className="max-w-2xl text-display-md leading-tight font-semibold text-text drop-shadow-md">
                {ui.systemsHeading}
              </h2>
              <p className="mt-4 max-w-xl text-lg text-muted drop-shadow">
                {ui.systemsBody}
              </p>
            </Container>
          </div>
        </Pinned>
      </div>
    </Section>
  )
}
