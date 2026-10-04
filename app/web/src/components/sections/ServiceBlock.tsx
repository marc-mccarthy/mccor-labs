import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Anchor } from '@/components/ui/anchor'
import { SectionHeading } from '@/components/ui/section-heading'
import type { Service } from '@/content/types'
import { CapabilityBlock } from './CapabilityBlock'

export function ServiceBlock({ service }: { service: Service }) {
  return (
    <Section className="relative">
      <span
        aria-hidden="true"
        data-service-rail=""
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-px origin-top bg-brand"
      />
      <Anchor id={service.slug} />
      <Container className="flex flex-col gap-8">
        <SectionHeading>{service.title}</SectionHeading>
        <span
          aria-hidden="true"
          data-target-cue=""
          className="-mt-6 block h-px w-24 bg-brand opacity-0"
        />
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
