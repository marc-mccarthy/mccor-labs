import { BookingCta } from '@/components/layout/BookingCta'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Reveal } from '@/components/motion/Reveal'
import { ui } from '@/content/ui'

export function CtaBlock() {
  return (
    <Section>
      <Container>
        <Reveal>
          <div className="flex flex-col items-start gap-6 rounded-xl border border-border bg-surface p-8 sm:p-12">
            <h2 className="text-3xl font-semibold tracking-tight text-text">
              {ui.ctaHeading}
            </h2>
            <p className="max-w-2xl text-lg text-muted">{ui.ctaBody}</p>
            <BookingCta size="lg" />
          </div>
        </Reveal>
      </Container>
    </Section>
  )
}
