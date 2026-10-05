import type { Metadata } from 'next'
import { LegalPage } from '@/components/sections/LegalPage'
import { terms } from '@/content/legal'

export const metadata: Metadata = {
  title: terms.title,
  description: terms.description,
}

export default function TermsPage() {
  return <LegalPage document={terms} />
}
