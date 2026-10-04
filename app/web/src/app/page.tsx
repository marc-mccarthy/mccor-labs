import { CtaBlock } from '@/components/sections/CtaBlock'
import { DeliveredStrip } from '@/components/sections/DeliveredStrip'
import { Hero } from '@/components/sections/Hero'
import { PipelineSection } from '@/components/sections/PipelineSection'
import { ProcessScroller } from '@/components/sections/ProcessScroller'
import { ServicesPreview } from '@/components/sections/ServicesPreview'
import { SystemsScene } from '@/components/sections/SystemsScene'
import { ui } from '@/content/ui'

export default function HomePage() {
  return (
    <>
      <Hero />
      <DeliveredStrip />
      <ServicesPreview />
      <SystemsScene />
      <PipelineSection />
      <ProcessScroller heading={ui.processHeading} />
      <CtaBlock />
    </>
  )
}
