import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'
import { ProcessScroller } from '@/components/sections/ProcessScroller'
import { ui } from '@/content/ui'

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
        image="/media/brand/header-process.webp"
        video={{
          webm: '/media/brand/header-process-loop.webm',
          mp4: '/media/brand/header-process-loop.mp4',
        }}
      />
      <ProcessScroller heading={ui.processStagesHeading} />
    </>
  )
}
