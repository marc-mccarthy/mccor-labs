import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'
import { ProcessScroller } from '@/components/sections/ProcessScroller'

export const metadata: Metadata = {
  title: 'Process',
  description: 'How an engagement runs, from first call to launch.',
}

export default function ProcessPage() {
  return (
    <>
      <PageHeader
        title="Process"
        description="How an engagement runs, from first call to launch."
      />
      <ProcessScroller />
    </>
  )
}
