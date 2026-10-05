import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Stagger } from '@/components/motion/Stagger'
import { SectionHeading } from '@/components/ui/section-heading'
import { proof } from '@/content/proof'
import { ui } from '@/content/ui'

export function DeliveredStrip() {
  return (
    <Section className="border-y border-border py-8 sm:py-12">
      <Container>
        <SectionHeading className="font-mono text-sm tracking-wider text-muted uppercase">
          {ui.deliveredHeading}
        </SectionHeading>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:justify-between">
          <Stagger>
            {proof.map((point) => (
              <p key={point.text} className="font-mono text-lg text-text">
                {point.text}
              </p>
            ))}
          </Stagger>
        </div>
      </Container>
    </Section>
  )
}
