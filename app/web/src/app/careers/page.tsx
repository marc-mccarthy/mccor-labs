import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'

export const metadata: Metadata = {
  title: 'Careers',
  description: 'How we hire, and what we look for.',
}

export default function CareersPage() {
  return <PageHeader title="Careers" description="How we hire, and what we look for." />
}
