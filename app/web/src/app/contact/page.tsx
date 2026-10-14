import type { Metadata } from 'next'

import { ContactForm } from '@/components/contact/ContactForm'
import { ContactPanel } from '@/components/contact/ContactPanel'
import { ContactBeam } from '@/components/sections/ContactBeam'
import { PageHeader } from '@/components/sections/PageHeader'
import { ui } from '@/content/ui'
import { env } from '@/lib/env'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Tell us about the project, or book a call directly.',
}

export default function ContactPage() {
  return (
    <>
      <PageHeader
        title="Contact"
        size="lg"
        eyebrow={{ index: '00', label: ui.contactEyebrowLabel }}
        description="Tell us about the project, or book a call directly."
        image="/media/brand/cta-terminus.webp"
        imageClassName="max-sm:object-[70%_50%]"
        scene={<ContactBeam />}
        handoff
      />
      <ContactPanel endpoint={env.contactEndpoint}>
        <ContactForm endpoint={env.contactEndpoint} />
      </ContactPanel>
    </>
  )
}
