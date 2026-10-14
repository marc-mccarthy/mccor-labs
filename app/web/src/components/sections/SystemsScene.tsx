'use client'

import dynamic from 'next/dynamic'
import { motionScene } from '@/components/motion/motionScene'
import { useRef } from 'react'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Pinned } from '@/components/motion/Pinned'
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

const PIN_HEIGHT = '150vh'

export function SystemsScene() {
  const ref = useRef<HTMLDivElement>(null)
  const progress = useScrollProgressValue(ref)
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
          <div className="relative flex h-screen items-center overflow-hidden bg-base">
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
