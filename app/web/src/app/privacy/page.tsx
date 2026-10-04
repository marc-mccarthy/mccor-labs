import type { Metadata } from 'next'
import { LegalPage } from '@/components/sections/LegalPage'
import { privacy } from '@/content/legal'

export const metadata: Metadata = {
  title: privacy.title,
  description: privacy.description,
}

export default function PrivacyPage() {
  return <LegalPage document={privacy} />
}
