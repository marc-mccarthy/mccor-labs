import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'
import { RoleBlock } from '@/components/sections/RoleBlock'
import { roles } from '@/content/careers'

export const metadata: Metadata = {
  title: 'Careers',
  description: 'How we hire, and what we look for.',
}

export default function CareersPage() {
  return (
    <div data-careers="">
      <PageHeader title="Careers" description="How we hire, and what we look for." />
      {roles.map((role) => (
        <RoleBlock key={role.slug} role={role} />
      ))}
    </div>
  )
}
