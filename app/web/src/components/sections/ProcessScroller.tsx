'use client'

import { useRef } from 'react'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Pinned } from '@/components/motion/Pinned'
import { useReducedMotion } from '@/components/motion/useReducedMotion'
import { useScrollProgress } from '@/components/motion/useScrollProgress'
import { SectionHeading } from '@/components/ui/section-heading'
import { process } from '@/content/process'

const VIEWPORT_UNITS = 100
const PIN_UNITS = 300
const PIN_START = VIEWPORT_UNITS / (VIEWPORT_UNITS + PIN_UNITS)
const PIN_END = PIN_UNITS / (VIEWPORT_UNITS + PIN_UNITS)

function pinnedFraction(progress: number): number {
  return Math.min(1, Math.max(0, (progress - PIN_START) / (PIN_END - PIN_START)))
}

function StageCard({ stage }: { stage: (typeof process)[number] }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-6">
      <p className="font-mono text-sm text-accent">
        {String(stage.index).padStart(2, '0')} · {stage.duration}
      </p>
      <h3 className="text-2xl font-semibold text-text">{stage.title}</h3>
      <p className="text-muted">{stage.summary}</p>
    </div>
  )
}

interface ProcessScrollerProps {
  heading?: string
}

function ProcessHeading({ heading }: ProcessScrollerProps) {
  return heading ? (
    <Container className="mb-8">
      <SectionHeading>{heading}</SectionHeading>
    </Container>
  ) : null
}

export function ProcessScroller({ heading }: ProcessScrollerProps) {
  const reducedMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const progress = useScrollProgress(ref)

  if (reducedMotion) {
    return (
      <Section>
        <ProcessHeading heading={heading} />
        <Container>
          <ol className="flex flex-col gap-6">
            {process.map((stage) => (
              <li key={stage.index}>
                <StageCard stage={stage} />
              </li>
            ))}
          </ol>
        </Container>
      </Section>
    )
  }

  const shift = pinnedFraction(progress) * ((process.length - 1) / process.length) * 100

  return (
    <Section className="py-0 sm:py-0">
      <div ref={ref}>
        <Pinned height={`${String(PIN_UNITS)}vh`}>
          <div className="flex h-screen flex-col justify-center overflow-hidden">
            <ProcessHeading heading={heading} />
            <ol
              className="flex"
              style={{
                width: `${String(process.length * 100)}%`,
                transform: `translateX(-${String(shift)}%)`,
              }}
            >
              {process.map((stage) => (
                <li key={stage.index} className="flex-1 px-4 sm:px-6">
                  <StageCard stage={stage} />
                </li>
              ))}
            </ol>
          </div>
        </Pinned>
      </div>
    </Section>
  )
}
