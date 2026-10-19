'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { useReducedMotion } from '@/components/motion/useReducedMotion'
import { useScrollProgressValue } from '@/components/motion/useScrollProgress'
import { GlowField } from '@/components/ui/glow-field'
import { SectionHeading } from '@/components/ui/section-heading'
import { process } from '@/content/process'
import { cn } from '@/lib/cn'

const VIEWPORT_UNITS = 100
export const PIN_UNITS = 150
const FLOAT_TOLERANCE = 1e-6

type StageState = 'active' | 'near' | 'far'

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function pinnedFraction(progress: number, viewportHeight: number): number {
  if (viewportHeight <= 0) return 0
  const unit = viewportHeight / VIEWPORT_UNITS
  const scrolled = (progress * (VIEWPORT_UNITS + PIN_UNITS) - VIEWPORT_UNITS) * unit
  const range = (PIN_UNITS - VIEWPORT_UNITS) * unit
  return clampUnit(Math.floor(scrolled + FLOAT_TOLERANCE) / range)
}

export function trackShift(
  fraction: number,
  scrollWidth: number,
  clientWidth: number,
): number {
  return clampUnit(fraction) * Math.max(0, scrollWidth - clientWidth)
}

export function activeStage(fraction: number): number {
  return Math.round(clampUnit(fraction) * (process.length - 1))
}

function stageState(index: number, active: number): StageState {
  const distance = Math.abs(index - active)
  if (distance === 0) return 'active'
  return distance === 1 ? 'near' : 'far'
}

const PIN_STYLE = { '--pin-height': `${String(PIN_UNITS)}vh` } as CSSProperties

const RESTING_TRACK = {
  '--track-fraction': '0',
  '--track-shift': '0px',
  '--active-index': '1',
  '--stage-count': String(process.length),
} as CSSProperties

interface TrackNodes {
  group: HTMLElement
  clip: HTMLElement
  track: HTMLElement
}

function driveTrack(
  { group, clip, track }: TrackNodes,
  progress: ReturnType<typeof useScrollProgressValue>,
): () => void {
  const cards = Array.from(track.children) as HTMLElement[]
  const size = { scroll: 0, client: 0 }
  let active = -1

  const write = () => {
    const fraction = pinnedFraction(progress.get(), window.innerHeight)
    const shift = trackShift(fraction, size.scroll, size.client)
    group.style.setProperty('--track-fraction', String(fraction))
    group.style.setProperty('--track-shift', `${String(shift)}px`)
    const next = activeStage(fraction)
    if (next === active) return
    active = next
    group.style.setProperty('--active-index', String(next + 1))
    cards.forEach((card, index) => {
      card.dataset.cardState = stageState(index, next)
    })
  }

  const measure = () => {
    size.scroll = track.scrollWidth
    size.client = clip.clientWidth
    write()
  }

  measure()
  const stopProgress = progress.on('change', write)
  if (typeof ResizeObserver === 'undefined') return stopProgress

  const observer = new ResizeObserver(measure)
  observer.observe(clip)
  observer.observe(track)
  return () => {
    stopProgress()
    observer.disconnect()
  }
}

function StageCard({ stage }: { stage: (typeof process)[number] }) {
  return (
    <div
      data-process-card=""
      className="flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-6 motion-safe:md:transition-[translate,border-color,background-color] motion-safe:md:duration-(--duration-standard) motion-safe:md:ease-standard motion-safe:md:group-data-[card-state=active]/stage:border-border-strong motion-safe:md:group-data-[card-state=active]/stage:bg-elevated motion-safe:md:group-data-[card-state=near]/stage:translate-y-2"
    >
      <p className="font-mono text-sm text-muted">
        {String(stage.index).padStart(2, '0')} ·{' '}
        <span
          data-process-chip=""
          className="inline-block rounded-full border border-border px-2"
        >
          {stage.duration}
        </span>
      </p>
      <h3 className="text-2xl font-semibold text-text">{stage.title}</h3>
      <p className="min-h-[3lh] text-muted">{stage.summary}</p>
    </div>
  )
}

function ProgressRail() {
  return (
    <div className="mb-6 hidden items-center gap-4 motion-safe:md:flex">
      <div
        data-process-counter=""
        className="shrink-0 font-mono text-sm text-muted tabular-nums"
      />
      <div className="relative flex h-px flex-1 items-center justify-between bg-border">
        <div
          data-process-fill=""
          className="absolute inset-0 origin-left scale-x-100 bg-brand motion-on:scale-x-(--track-fraction)"
        />
        {process.map((stage) => (
          <div
            key={stage.index}
            className="relative size-1.5 rounded-full bg-border-strong"
          />
        ))}
      </div>
    </div>
  )
}

interface ProcessScrollerProps {
  heading?: string
  eyebrow?: { index: string; label: string }
  glow?: boolean
}

function ProcessHeading({
  heading,
  eyebrow,
}: Pick<ProcessScrollerProps, 'heading' | 'eyebrow'>) {
  return heading ? (
    <Container className="mb-8">
      <SectionHeading eyebrow={eyebrow} words={eyebrow !== undefined} rule={false}>
        {heading}
      </SectionHeading>
    </Container>
  ) : null
}

export function ProcessScroller({
  heading,
  eyebrow,
  glow = false,
}: ProcessScrollerProps) {
  const reducedMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)
  const clipRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLOListElement>(null)
  const progress = useScrollProgressValue(ref)

  useEffect(() => {
    const group = groupRef.current
    const clip = clipRef.current
    const track = trackRef.current
    if (reducedMotion || !group || !clip || !track) return undefined
    return driveTrack({ group, clip, track }, progress)
  }, [progress, reducedMotion])

  return (
    <Section
      className={cn(
        'motion-safe:md:-my-[max(0px,calc(50vh-12rem))] motion-safe:md:pb-0',
        glow && 'relative isolate',
      )}
    >
      {glow && <GlowField anchor="left" />}
      <div ref={ref} className="motion-safe:md:h-(--pin-height)" style={PIN_STYLE}>
        <div className="motion-safe:md:sticky motion-safe:md:top-0">
          <div
            data-testid="process-stage"
            className="motion-safe:md:flex motion-safe:md:h-screen motion-safe:md:flex-col motion-safe:md:overflow-hidden motion-safe:md:pt-[max(0px,calc(50vh-12rem))]"
          >
            <div ref={groupRef} data-testid="process-group" style={RESTING_TRACK}>
              <ProcessHeading heading={heading} eyebrow={eyebrow} />
              <Container>
                <ProgressRail />
                <div
                  ref={clipRef}
                  data-testid="process-clip"
                  className="relative before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-border motion-safe:md:overflow-x-clip motion-safe:md:before:hidden"
                >
                  <ol
                    ref={trackRef}
                    className="flex flex-col gap-6 pl-6 motion-safe:md:-translate-x-(--track-shift) motion-safe:md:flex-row motion-safe:md:pl-0 motion-reduce:lg:grid motion-reduce:lg:grid-cols-2"
                  >
                    {process.map((stage, index) => (
                      <li
                        key={stage.index}
                        data-card-state={stageState(index, 0)}
                        className="group/stage motion-safe:md:w-full motion-safe:md:shrink-0 motion-safe:lg:w-[calc(50%_-_0.75rem)]"
                      >
                        <StageCard stage={stage} />
                      </li>
                    ))}
                  </ol>
                  <div
                    data-process-rail=""
                    className="absolute inset-y-0 left-0 w-px origin-top bg-brand motion-safe:md:hidden"
                  />
                </div>
              </Container>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
