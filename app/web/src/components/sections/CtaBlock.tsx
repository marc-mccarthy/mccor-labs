import { BookingCta } from '@/components/layout/BookingCta'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Reveal } from '@/components/motion/Reveal'
import { SectionHeading } from '@/components/ui/section-heading'
import { ui } from '@/content/ui'

export function CtaBlock() {
  return (
    <Section className="relative overflow-hidden">
      <img
        src="/media/brand/cta-terminus.webp"
        alt=""
        loading="lazy"
        decoding="async"
        data-testid="cta-image"
        className="absolute inset-0 h-full w-full mask-y-from-70% object-cover object-right"
      />
      <Container className="relative">
        <Reveal>
          <div className="flex flex-col items-start gap-6 rounded-xl border border-border bg-linear-to-r from-surface via-surface/90 to-surface/40 p-8 sm:p-12">
            <SectionHeading>{ui.ctaHeading}</SectionHeading>
            <p className="max-w-2xl text-lg text-muted">{ui.ctaBody}</p>
            <BookingCta size="lg" />
          </div>
        </Reveal>
      </Container>
    </Section>
  )
}
