import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'

export const metadata: Metadata = {
  title: 'Terms',
  description: 'The terms that apply to this site.',
}

export default function TermsPage() {
  return <PageHeader title="Terms" description="The terms that apply to this site." />
}
