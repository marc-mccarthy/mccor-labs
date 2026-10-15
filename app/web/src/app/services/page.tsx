import type { Metadata } from 'next'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { CtaBlock } from '@/components/sections/CtaBlock'
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
        video={{
          webm: '/media/brand/header-services-loop.webm',
          mp4: '/media/brand/header-services-loop.mp4',
        }}
      />
      {services.map((service, index) => (
        <ServiceBlock
          key={service.slug}
          service={service}
          index={index}
          total={services.length}
        />
      ))}
      <Section>
        <Container>
          <IntegrationMarks {...toolsWeBuildWith} />
        </Container>
      </Section>
      <CtaBlock />
    </>
  )
}
