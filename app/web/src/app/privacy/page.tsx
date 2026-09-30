import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How we handle information you send us.',
}

export default function PrivacyPage() {
  return (
    <PageHeader
      title="Privacy Policy"
      description="How we handle information you send us."
    />
  )
}
