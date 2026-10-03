import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Stagger } from '@/components/motion/Stagger'
import { proof } from '@/content/proof'

export function DeliveredStrip() {
  return (
    <Section>
      <Container className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <Stagger>
          {proof.map((point) => (
            <p key={point.text} className="font-mono text-sm text-muted">
              {point.text}
            </p>
          ))}
        </Stagger>
      </Container>
    </Section>
  )
}
