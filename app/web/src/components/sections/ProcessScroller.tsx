'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Pinned } from '@/components/motion/Pinned'
import { useReducedMotion } from '@/components/motion/useReducedMotion'
import { useScrollProgressValue } from '@/components/motion/useScrollProgress'
import { GlowField } from '@/components/ui/glow-field'
import { SectionHeading } from '@/components/ui/section-heading'
import { process } from '@/content/process'
import { cn } from '@/lib/cn'

const VIEWPORT_UNITS = 100
const PIN_UNITS = 200
const PIN_START = VIEWPORT_UNITS / (VIEWPORT_UNITS + PIN_UNITS)
const PIN_END = PIN_UNITS / (VIEWPORT_UNITS + PIN_UNITS)

function pinnedFraction(progress: number): number {
  return Math.min(1, Math.max(0, (progress - PIN_START) / (PIN_END - PIN_START)))
}

function trackShift(fraction: number) {
  return {
    '--shift-md': `${String(fraction * (process.length - 1) * 100)}%`,
    '--shift-lg': `${String(fraction * (process.length - 2) * 50)}%`,
  }
}

const RESTING_TRACK = trackShift(0) as CSSProperties

function StageCard({ stage }: { stage: (typeof process)[number] }) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-6">
      <p className="font-mono text-sm text-muted">
        {String(stage.index).padStart(2, '0')} · {stage.duration}
      </p>
      <h3 className="text-2xl font-semibold text-text">{stage.title}</h3>
      <p className="min-h-[3lh] text-muted">{stage.summary}</p>
    </div>
  )
}

interface ProcessScrollerProps {
  heading?: string
  eyebrow?: { index: string; label: string }
  headingSize?: 'sm' | 'md'
  glow?: boolean
}

function ProcessHeading({
  heading,
  eyebrow,
  headingSize,
}: Pick<ProcessScrollerProps, 'heading' | 'eyebrow' | 'headingSize'>) {
  return heading ? (
    <Container className="mb-8">
      <SectionHeading size={headingSize} eyebrow={eyebrow} words={eyebrow !== undefined}>
        {heading}
      </SectionHeading>
    </Container>
  ) : null
}

export function ProcessScroller({
  heading,
  eyebrow,
  headingSize,
  glow = false,
}: ProcessScrollerProps) {
  const reducedMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLOListElement>(null)
  const progress = useScrollProgressValue(ref)

  useEffect(() => {
    const track = trackRef.current
    if (reducedMotion || !track) return undefined
    const write = (value: number) => {
      for (const [name, shift] of Object.entries(trackShift(pinnedFraction(value)))) {
        track.style.setProperty(name, shift)
      }
    }
    write(progress.get())
    return progress.on('change', write)
  }, [progress, reducedMotion])

  if (reducedMotion) {
    return (
      <Section className={glow ? 'relative isolate' : undefined}>
        {glow && <GlowField anchor="left" />}
        <ProcessHeading heading={heading} eyebrow={eyebrow} headingSize={headingSize} />
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

  return (
    <Section
      className={cn(
        'motion-safe:md:-my-[max(0px,calc(50vh-12rem))] motion-safe:md:py-0',
        glow && 'relative isolate',
      )}
    >
      {glow && <GlowField anchor="left" />}
      <div ref={ref}>
        <Pinned height={`${String(PIN_UNITS)}vh`} from="md">
          <div className="motion-safe:md:flex motion-safe:md:h-screen motion-safe:md:flex-col motion-safe:md:justify-center motion-safe:md:overflow-hidden">
            <ProcessHeading
              heading={heading}
              eyebrow={eyebrow}
              headingSize={headingSize}
            />
            <Container>
              <ol
                ref={trackRef}
                className="flex flex-col gap-6 motion-safe:md:-translate-x-(--shift-md) motion-safe:md:flex-row motion-safe:md:gap-0 motion-safe:lg:-translate-x-(--shift-lg)"
                style={RESTING_TRACK}
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
