import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Stagger } from '@/components/motion/Stagger'
import { proof } from '@/content/proof'

export function DeliveredStrip() {
  return (
    <Section className="border-y border-border py-8 sm:py-12">
      <Container className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <Stagger>
          {proof.map((point) => (
            <p key={point.text} className="font-mono text-lg text-text">
              {point.text}
            </p>
          ))}
        </Stagger>
      </Container>
    </Section>
  )
}
