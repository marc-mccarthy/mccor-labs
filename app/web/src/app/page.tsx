import { BookingCta } from '@/components/layout/BookingCta'
import { Section } from '@/components/layout/Section'
import { HeroMotionCanvas } from '@/components/motion/HeroMotionCanvas'
import { VideoMotionHero } from '@/components/motion/VideoMotionHero'
import { site } from '@/content/site'

export default function HomePage() {
  return (
    <>
      <VideoMotionHero
        posterSrc="/media/brand/mccor-stag-hero.jpg"
        videoSrc="/media/brand/hero-loop.mp4"
        webmSrc="/media/brand/hero-loop.webm"
        altText="McCor Labs dark monolith architecture with glowing red stag"
        className="flex min-h-[85vh] items-center"
        objectPosition="object-right lg:object-[92%_center]"
      >
        {/* Subtle interactive particle lattice overlaid on top of video */}
        <HeroMotionCanvas className="opacity-30" />
        <Section className="w-full">
          {/* Padded exactly 1/15th of screen width from the left edge */}
          <div
            className="relative z-10 w-full"
            style={{
              paddingLeft: 'max(24px, calc(100vw / 15))',
              paddingRight: 'max(24px, calc(100vw / 15))',
            }}
          >
            <div className="max-w-xl lg:max-w-2xl">
              {/* Eyebrow badge */}
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-semibold tracking-wider text-muted uppercase backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                Senior Engineering & AI Studio
              </div>

              {/* Main Clever Slogan */}
              <h1 className="text-4xl font-extrabold tracking-tight text-text drop-shadow-md sm:text-5xl lg:text-6xl">
                Swift by Instinct.{' '}
                <span className="bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
                  Engineered to the Core.
                </span>
              </h1>

              {/* Tagline / Subtitle */}
              <p className="mt-6 text-lg text-muted drop-shadow sm:text-xl">
                {site.tagline}
              </p>

              <div className="mt-8 flex items-center gap-4">
                <BookingCta size="lg" />
              </div>
            </div>
          </div>
        </Section>
      </VideoMotionHero>
    </>
  )
}
