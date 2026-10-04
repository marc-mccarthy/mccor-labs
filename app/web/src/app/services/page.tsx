import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'
import { ServiceBlock } from '@/components/sections/ServiceBlock'
import { services } from '@/content/services'

export const metadata: Metadata = {
  title: 'Services',
  description: 'What we build, and how we price it.',
}

export default function ServicesPage() {
  return (
    <>
      <PageHeader title="Services" description="What we build, and how we price it." />
      {services.map((service) => (
        <ServiceBlock key={service.slug} service={service} />
      ))}
    </>
  )
}
