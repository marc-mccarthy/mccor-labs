import type { Metadata } from 'next'
import { LegalPage } from '@/components/sections/LegalPage'
import { terms } from '@/content/legal'
import { pageSeo } from '@/lib/seo'

export const metadata: Metadata = {
  title: terms.title,
  description: terms.description,
  ...pageSeo('/terms/'),
}

export default function TermsPage() {
  return <LegalPage document={terms} />
}
