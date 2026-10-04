import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'
import { TeamGrid } from '@/components/sections/TeamGrid'
import { about } from '@/content/about'

export const metadata: Metadata = {
  title: 'About',
  description: 'A small senior team, and how we work together.',
}

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About"
        description={about.opening}
        image="/media/brand/header-about.webp"
      />
      <TeamGrid />
    </>
  )
}
