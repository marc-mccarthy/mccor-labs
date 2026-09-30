import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'

export const metadata: Metadata = {
  title: 'About',
  description: 'A small senior team, and how we work together.',
}

export default function AboutPage() {
  return (
    <PageHeader
      title="About"
      description="A small senior team, and how we work together."
    />
  )
}
