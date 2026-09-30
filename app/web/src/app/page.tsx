import { BookingCta } from '@/components/layout/BookingCta'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { site } from '@/content/site'

export default function HomePage() {
  return (
    <>
      <Section>
        <Container>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-text sm:text-6xl">
            {site.tagline}
          </h1>
          {/* Phase 3 replaces this section's background with the signature
              WebGL moment. The composition stays; the effect sits behind it. */}
          <div className="mt-10">
            <BookingCta size="lg" />
          </div>
        </Container>
      </Section>
    </>
  )
}
