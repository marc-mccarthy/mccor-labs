import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Anchor } from '@/components/ui/anchor'
import type { Service } from '@/content/types'
import { CapabilityBlock } from './CapabilityBlock'

export function ServiceBlock({ service }: { service: Service }) {
  return (
    <Section>
      <Anchor id={service.slug} />
      <Container className="flex flex-col gap-8">
        <h2 className="text-display-sm leading-tight font-semibold tracking-tight text-text">
          {service.title}
        </h2>
        <p className="max-w-3xl text-lg text-muted">{service.detail}</p>
        <ul className="grid gap-2 text-text sm:grid-cols-2">
          {service.deliverables.map((deliverable) => (
            <li key={deliverable}>{deliverable}</li>
          ))}
        </ul>
        {service.capabilities?.map((capability) => (
          <CapabilityBlock key={capability.slug} capability={capability} />
        ))}
      </Container>
    </Section>
  )
}
