'use client'

import dynamic from 'next/dynamic'
import { motionScene } from '@/components/motion/motionScene'
import { Container } from '@/components/layout/Container'
import { BookingCta } from '@/components/layout/BookingCta'
import { HeroMotionCanvas } from '@/components/motion/HeroMotionCanvas'
import { Parallax } from '@/components/motion/Parallax'
import { VideoMotionHero } from '@/components/motion/VideoMotionHero'
import { Badge } from '@/components/ui/badge'
import { site } from '@/content/site'

const StagScene = motionScene(
  dynamic(
    () => import('@/components/effects/StagScene').then((module) => module.StagScene),
    { ssr: false },
  ),
)

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <Parallax>
        <div className="relative flex min-h-[85vh] items-end">
          <VideoMotionHero
            posterSrc="/media/brand/mccor-stag-hero.webp"
            videoSrc="/media/brand/hero-loop.mp4"
            webmSrc="/media/brand/hero-loop.webm"
            altText="McCor Labs dark monolith architecture with glowing red stag"
            className="absolute inset-0"
            objectPosition="object-right lg:object-[92%_center]"
          />
          <StagScene
            className="pointer-events-none absolute inset-0 z-5"
            fallback={<HeroMotionCanvas className="opacity-30" />}
          />
          <Container className="relative z-10 pt-16 pb-8 sm:pt-24">
            <div className="max-w-xl lg:max-w-3xl">
              <Badge className="mb-5 gap-2 bg-surface/80 font-sans font-semibold backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                Senior Engineering & AI Studio
              </Badge>

              <p className="font-mono text-sm tracking-wider text-muted uppercase">
                {site.slogan}
              </p>

              <h1 className="mt-4 text-display-sm leading-tight font-semibold tracking-tight text-text drop-shadow-md">
                {site.tagline}
              </h1>

              <div className="mt-8 flex items-center gap-4">
                <BookingCta size="lg" />
              </div>
            </div>
          </Container>
        </div>
      </Parallax>
    </section>
  )
}
