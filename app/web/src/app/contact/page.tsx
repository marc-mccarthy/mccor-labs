import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Tell us about the project, or book a call directly.',
}

export default function ContactPage() {
  return (
    <PageHeader
      title="Contact"
      description="Tell us about the project, or book a call directly."
    />
  )
}
