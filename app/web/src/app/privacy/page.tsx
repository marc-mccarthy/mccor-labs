import type { Metadata } from 'next'
import { LegalPage } from '@/components/sections/LegalPage'
import { privacy } from '@/content/legal'
import { pageSeo } from '@/lib/seo'

export const metadata: Metadata = {
  title: privacy.title,
  description: privacy.description,
  ...pageSeo('/privacy/'),
}

export default function PrivacyPage() {
  return <LegalPage document={privacy} />
}
