import type { Metadata } from 'next'

import { ContactForm } from '@/components/contact/ContactForm'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { PageHeader } from '@/components/sections/PageHeader'
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
        description="Tell us about the project, or book a call directly."
        image="/media/brand/cta-terminus.webp"
      />
      <Section>
        <Container>
          <ContactForm endpoint={env.contactEndpoint} />
        </Container>
      </Section>
    </>
  )
}
