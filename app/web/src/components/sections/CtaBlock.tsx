import { BookingCta } from '@/components/layout/BookingCta'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Reveal } from '@/components/motion/Reveal'
import { Spotlight } from '@/components/motion/Spotlight'
import { SectionHeading } from '@/components/ui/section-heading'
import { ui } from '@/content/ui'

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
        <img
          src="/media/brand/mccor-stag-stride.webp"
          alt=""
          width={585}
          height={748}
          loading="lazy"
          decoding="async"
          data-testid="cta-stag"
          data-cta-stag=""
          className="pointer-events-none absolute right-12 bottom-0 hidden h-[110%] w-auto [filter:drop-shadow(0_0_2rem_transparent)] transition-[filter] duration-(--duration-standard) ease-(--ease-pointer) group-has-[a:hover]/cta:[filter:drop-shadow(0_0_2rem_color-mix(in_oklab,var(--color-accent)_45%,transparent))] xl:block"
        />
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
