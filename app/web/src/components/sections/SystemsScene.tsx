'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { motionScene } from '@/components/motion/motionScene'
import { useRef, type RefObject } from 'react'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { UNDERLINE } from '@/components/layout/underline'
import { Pinned } from '@/components/motion/Pinned'
import { useReducedMotion } from '@/components/motion/useReducedMotion'
import { useScrollProgressValue } from '@/components/motion/useScrollProgress'
import { Eyebrow } from '@/components/ui/eyebrow'
import { VideoPauseToggle } from '@/components/motion/VideoPauseToggle'
import { useVideoAttach } from '@/components/motion/VideoMotionHero'
import { ui } from '@/content/ui'
import { cn } from '@/lib/cn'

const NodeLatticeScene = motionScene(
  dynamic(
    () =>
      import('@/components/effects/NodeLatticeScene').then(
        (module) => module.NodeLatticeScene,
      ),
    { ssr: false },
  ),
)

const PIN_UNITS = 150
const PIN_HEIGHT = `${String(PIN_UNITS)}vh`
const EVALUATION_HREF = '/services/#ai-engineering'

function SystemsGates({
  listRef,
  reducedMotion,
}: {
  listRef: RefObject<HTMLOListElement | null>
  reducedMotion: boolean
}) {
  const initial = reducedMotion ? 'passed' : 'pending'
  return (
    <ol
      ref={listRef}
      data-testid="systems-gates"
      className="mt-6 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted drop-shadow sm:flex-col sm:gap-2 sm:text-sm"
    >
      {ui.systemsGates.map((gate) => (
        <li
          key={gate}
          data-gate=""
          data-state={initial}
          className="group flex items-center gap-2 data-[state=passed]:text-text motion-reduce:text-text motion-on:transition-colors motion-on:duration-(--duration-standard) motion-on:ease-(--ease-standard)"
        >
          <span
            aria-hidden="true"
            data-gate-dot=""
            className="size-2 shrink-0 rounded-full bg-border-strong group-data-[state=passed]:bg-accent motion-reduce:bg-accent motion-on:transition-colors motion-on:duration-(--duration-standard) motion-on:ease-(--ease-standard)"
          />
          {gate}
        </li>
      ))}
    </ol>
  )
}

export function SystemsScene() {
  const ref = useRef<HTMLDivElement>(null)
  const gatesRef = useRef<HTMLOListElement>(null)
  const progress = useScrollProgressValue(ref)
  const reducedMotion = useReducedMotion()
  const {
    videoRef,
    shouldAttachVideo,
    videoLoaded,
    setVideoLoaded,
    paused,
    togglePaused,
  } = useVideoAttach({
    enabled: true,
    media: '(min-width: 768px)',
    onScreenRef: ref,
  })

  return (
    <Section className="py-0 sm:py-0">
      <div ref={ref}>
        <Pinned height={PIN_HEIGHT}>
          <div
            data-testid="systems-stage"
            className="relative flex h-screen items-center overflow-hidden bg-base"
          >
            <img
              src="/media/brand/systems-lattice.webp"
              alt=""
              loading="lazy"
              data-testid="systems-poster"
              className={cn(
                'absolute inset-0 h-full w-full object-cover transition-opacity duration-(--duration-scene)',
                videoLoaded ? 'opacity-0' : 'opacity-60',
              )}
            />
            {shouldAttachVideo && (
              <video
                ref={videoRef}
                autoPlay
                muted
                loop
                playsInline
                preload="none"
                aria-hidden="true"
                data-testid="systems-video"
                onCanPlay={() => {
                  setVideoLoaded(true)
                }}
                className={cn(
                  'absolute inset-0 h-full w-full object-cover transition-opacity duration-(--duration-scene)',
                  videoLoaded ? 'opacity-60' : 'opacity-0',
                )}
              >
                <source src="/media/brand/systems-push.webm" type="video/webm" />
                <source src="/media/brand/systems-push.mp4" type="video/mp4" />
              </video>
            )}
            <NodeLatticeScene
              progress={progress}
              gatePinUnits={PIN_UNITS}
              gateListRef={gatesRef}
              className="pointer-events-none absolute inset-0 z-5"
            />
            <Container className="relative z-10">
              <Eyebrow
                index="02"
                label={ui.eyebrows.evaluation}
                className="drop-shadow"
              />
              <h2 className="max-w-2xl text-display-md leading-tight font-semibold text-text drop-shadow-md">
                {ui.systemsHeading}
              </h2>
              <p className="mt-4 max-w-xl text-lg text-muted drop-shadow">
                {ui.systemsBody}
              </p>
              <SystemsGates listRef={gatesRef} reducedMotion={reducedMotion} />
              <Link
                href={EVALUATION_HREF}
                className={cn(
                  'mt-6 inline-block press font-medium text-text drop-shadow',
                  UNDERLINE,
                )}
              >
                {ui.systemsLink}
              </Link>
            </Container>
            {shouldAttachVideo && (
              <VideoPauseToggle paused={paused} onToggle={togglePaused} />
            )}
          </div>
        </Pinned>
      </div>
    </Section>
  )
}
