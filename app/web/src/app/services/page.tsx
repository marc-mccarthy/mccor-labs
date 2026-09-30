import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'

export const metadata: Metadata = {
  title: 'Services',
  description: 'What we build, and how we price it.',
}

export default function ServicesPage() {
  return <PageHeader title="Services" description="What we build, and how we price it." />
}
