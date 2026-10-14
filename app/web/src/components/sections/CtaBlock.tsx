'use client'

import dynamic from 'next/dynamic'
import { BookingCta } from '@/components/layout/BookingCta'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { motionScene } from '@/components/motion/motionScene'
import { Reveal } from '@/components/motion/Reveal'
import { Spotlight } from '@/components/motion/Spotlight'
import { SectionHeading } from '@/components/ui/section-heading'
import { ui } from '@/content/ui'

const StagScene = motionScene(
  dynamic(
    () => import('@/components/effects/StagScene').then((module) => module.StagScene),
    { ssr: false },
  ),
)

export function CtaBlock() {
  return (
    <Section size="spacious" className="relative overflow-hidden">
      <img
        src="/media/brand/cta-terminus.webp"
        alt=""
        loading="lazy"
        decoding="async"
        data-testid="cta-image"
        className="absolute inset-0 h-full w-full mask-y-from-70% object-cover object-right"
      />
      <Container className="group/cta relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-12 bottom-0 hidden aspect-[585/748] h-[110%] xl:block"
        >
          <StagScene
            className="absolute inset-0"
            instanceId="cta"
            layout="centred"
            assembleOn="view"
            fallback={
              <img
                src="/media/brand/mccor-stag-stride.webp"
                alt=""
                width={585}
                height={748}
                loading="lazy"
                decoding="async"
                data-testid="cta-stag"
                data-cta-stag=""
                className="block h-full w-full [filter:drop-shadow(0_0_2rem_transparent)] transition-[filter] duration-(--duration-standard) ease-(--ease-pointer) group-has-[a:hover]/cta:[filter:drop-shadow(0_0_2rem_color-mix(in_oklab,var(--color-accent)_45%,transparent))]"
              />
            }
          />
        </div>
        <div className="group relative isolate flex flex-col items-start gap-6 rounded-xl border border-border bg-linear-to-r from-surface via-surface/90 to-surface/40 p-8 sm:p-12">
          <Spotlight size="panel" />
          <span
            aria-hidden="true"
            data-signal-sweep=""
            data-cta-edge=""
            className="pointer-events-none absolute inset-x-6 -top-px"
          />
          <div>
            <SectionHeading
              size="md"
              words
              eyebrow={{ index: '05', label: ui.eyebrows.contact }}
            >
              {ui.ctaHeading}
            </SectionHeading>
          </div>
          <Reveal>
            <div className="flex flex-col items-start gap-6">
              <p className="max-w-2xl text-lg text-muted">{ui.ctaBody}</p>
              <BookingCta size="lg" />
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  )
}
