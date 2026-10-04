'use client'

import { useRef, type CSSProperties } from 'react'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Pinned } from '@/components/motion/Pinned'
import { useReducedMotion } from '@/components/motion/useReducedMotion'
import { useScrollProgress } from '@/components/motion/useScrollProgress'
import { SectionHeading } from '@/components/ui/section-heading'
import { process } from '@/content/process'

const VIEWPORT_UNITS = 100
const PIN_UNITS = 200
const PIN_START = VIEWPORT_UNITS / (VIEWPORT_UNITS + PIN_UNITS)
const PIN_END = PIN_UNITS / (VIEWPORT_UNITS + PIN_UNITS)

function pinnedFraction(progress: number): number {
  return Math.min(1, Math.max(0, (progress - PIN_START) / (PIN_END - PIN_START)))
}

function StageCard({ stage }: { stage: (typeof process)[number] }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-6">
      <p className="font-mono text-sm text-muted">
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

  const fraction = pinnedFraction(progress)
  const track = {
    '--shift-md': `${String(fraction * (process.length - 1) * 100)}%`,
    '--shift-lg': `${String(fraction * (process.length - 2) * 50)}%`,
  } as CSSProperties

  return (
    <Section className="motion-safe:md:-my-[max(0px,calc(50vh-12rem))] motion-safe:md:py-0">
      <div ref={ref}>
        <Pinned height={`${String(PIN_UNITS)}vh`} from="md">
          <div className="motion-safe:md:flex motion-safe:md:h-screen motion-safe:md:flex-col motion-safe:md:justify-center motion-safe:md:overflow-hidden">
            <ProcessHeading heading={heading} />
            <Container>
              <ol
                className="flex flex-col gap-6 motion-safe:md:-translate-x-(--shift-md) motion-safe:md:flex-row motion-safe:md:gap-0 motion-safe:lg:-translate-x-(--shift-lg)"
                style={track}
              >
                {process.map((stage) => (
                  <li
                    key={stage.index}
                    className="motion-safe:md:w-full motion-safe:md:shrink-0 motion-safe:md:pr-6 motion-safe:lg:w-1/2"
                  >
                    <StageCard stage={stage} />
                  </li>
                ))}
              </ol>
            </Container>
          </div>
        </Pinned>
      </div>
    </Section>
  )
}
