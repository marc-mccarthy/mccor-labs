import { BookingCta } from '@/components/layout/BookingCta'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Reveal } from '@/components/motion/Reveal'
import { SectionHeading } from '@/components/ui/section-heading'
import { ui } from '@/content/ui'

export function CtaBlock() {
  return (
    <Section>
      <Container>
        <Reveal>
          <div className="flex flex-col items-start gap-6 rounded-xl border border-border bg-surface p-8 sm:p-12">
            <SectionHeading>{ui.ctaHeading}</SectionHeading>
            <p className="max-w-2xl text-lg text-muted">{ui.ctaBody}</p>
            <BookingCta size="lg" />
          </div>
        </Reveal>
      </Container>
    </Section>
  )
}
