import { CtaBlock } from '@/components/sections/CtaBlock'
import { DeliveredStrip } from '@/components/sections/DeliveredStrip'
import { Hero } from '@/components/sections/Hero'
import { LazyProcessScroller, LazySystemsScene } from '@/components/sections/LazySections'
import { PipelineSection } from '@/components/sections/PipelineSection'
import { ServicesPreview } from '@/components/sections/ServicesPreview'

export default function HomePage() {
  return (
    <>
      <Hero />
      <DeliveredStrip />
      <ServicesPreview />
      <PipelineSection />
      <LazyProcessScroller />
      <LazySystemsScene />
      <CtaBlock />
    </>
  )
}
