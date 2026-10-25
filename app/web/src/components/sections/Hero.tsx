'use client'

import dynamic from 'next/dynamic'
import { Fragment, useRef, useState } from 'react'
import { motionScene } from '@/components/motion/motionScene'
import { Container } from '@/components/layout/Container'
import { BookingCta } from '@/components/layout/BookingCta'
import { HeroMotionCanvas } from '@/components/motion/HeroMotionCanvas'
import { Parallax } from '@/components/motion/Parallax'
import { VideoMotionHero } from '@/components/motion/VideoMotionHero'
import { Badge } from '@/components/ui/badge'
import { heroMedia } from '@/content/hero-media'
import { site } from '@/content/site'
import { cn } from '@/lib/cn'

const StagScene = motionScene(
  dynamic(
    () => import('@/components/effects/StagScene').then((module) => module.StagScene),
    { ssr: false },
  ),
)

const sloganSentences = site.slogan.split(/(?<=\.)\s+/)

export function Hero() {
  const [introPlaying, setIntroPlaying] = useState(false)
  const sectionRef = useRef<HTMLElement | null>(null)

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      <Parallax>
        <div className="relative flex min-h-[85vh] items-end">
          <VideoMotionHero
            posterSrc={heroMedia.poster}
            videoSrc={heroMedia.loop.mp4}
            webmSrc={heroMedia.loop.webm}
            introSrc={heroMedia.intro.mp4}
            introWebmSrc={heroMedia.intro.webm}
            onIntroChange={setIntroPlaying}
            altText="McCor Labs dark monolith architecture with glowing red stag"
            className="absolute inset-0"
            objectPosition="object-right lg:object-[92%_center]"
          />
          <StagScene
            className={cn(
              'pointer-events-none absolute inset-0 z-5 transition-opacity duration-(--duration-scene)',
              introPlaying && 'opacity-0',
            )}
            fallback={<HeroMotionCanvas className="opacity-30" />}
            exitTarget={sectionRef}
          />
          <Container className="relative z-10 pt-16 pb-8 sm:pt-24">
            <div className="relative isolate max-w-xl lg:max-w-5xl">
              <div
                aria-hidden="true"
                data-hero-scrim
                className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,color-mix(in_oklab,var(--color-base)_85%,transparent),transparent)] lg:hidden"
              />
              <Badge className="mb-5 gap-2 bg-surface/80 font-sans font-semibold backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-brand motion-on:animate-pulse" />
                Senior Engineering & AI Studio
              </Badge>

              <h1 className="text-hero leading-tight font-bold text-balance text-text drop-shadow-md lg:text-hero-lg">
                {sloganSentences.map((sentence, index) => (
                  <Fragment key={sentence}>
                    {index > 0 && ' '}
                    <span className="lg:block">{sentence}</span>
                  </Fragment>
                ))}
              </h1>

              <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted drop-shadow-md sm:text-xl motion-on:animate-lede">
                {site.lede}
              </p>

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
