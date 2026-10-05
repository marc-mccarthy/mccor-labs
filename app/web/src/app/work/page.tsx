import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'

export const metadata: Metadata = {
  title: 'Work',
  description: 'Case studies are in production. Talk to us in the meantime.',
}

export default function WorkPage() {
  return (
    <PageHeader
      title="Work"
      description="Case studies are in production. Talk to us in the meantime."
    />
  )
}
