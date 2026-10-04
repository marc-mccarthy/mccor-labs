import type { Metadata } from 'next'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { PageHeader } from '@/components/sections/PageHeader'
import { ServiceBlock } from '@/components/sections/ServiceBlock'
import { IntegrationMarks } from '@/components/substance/IntegrationMarks'
import { services } from '@/content/services'
import { toolsWeBuildWith } from '@/content/substance'

export const metadata: Metadata = {
  title: 'Services',
  description: 'What we build, and how we price it.',
}

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        title="Services"
        description="What we build, and how we price it."
        image="/media/brand/header-services.webp"
      />
      {services.map((service) => (
        <ServiceBlock key={service.slug} service={service} />
      ))}
      <Section>
        <Container>
          <IntegrationMarks {...toolsWeBuildWith} />
        </Container>
      </Section>
    </>
  )
}
