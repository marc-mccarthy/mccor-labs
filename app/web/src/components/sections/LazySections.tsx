'use client'

import dynamic from 'next/dynamic'
import { Section } from '@/components/layout/Section'

const PROCESS_HEIGHT = '300vh'
const SYSTEMS_HEIGHT = '200vh'

function Placeholder({ height }: { height: string }) {
  return (
    <Section className="py-0 sm:py-0">
      <div style={{ height }} />
    </Section>
  )
}

export const LazyProcessScroller = dynamic(
  () =>
    import('@/components/sections/ProcessScroller').then(
      (module) => module.ProcessScroller,
    ),
  { ssr: false, loading: () => <Placeholder height={PROCESS_HEIGHT} /> },
)

export const LazySystemsScene = dynamic(
  () =>
    import('@/components/sections/SystemsScene').then((module) => module.SystemsScene),
  { ssr: false, loading: () => <Placeholder height={SYSTEMS_HEIGHT} /> },
)
