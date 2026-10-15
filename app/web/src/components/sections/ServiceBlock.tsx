import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Anchor } from '@/components/ui/anchor'
import { SectionHeading } from '@/components/ui/section-heading'
import type { Service } from '@/content/types'
import { CapabilityBlock } from './CapabilityBlock'

interface ServiceBlockProps {
  service: Service
  index: number
  total: number
}

const pad = (value: number) => String(value).padStart(2, '0')

export function ServiceBlock({ service, index, total }: ServiceBlockProps) {
  return (
    <Section className="relative">
      <Anchor id={service.slug} />
      <Container className="flex flex-col gap-6">
        <SectionHeading eyebrow={{ index: pad(index + 1), label: pad(total) }}>
          {service.title}
        </SectionHeading>
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
