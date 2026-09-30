import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'

interface PageHeaderProps {
  title: string
  description: string
}

/** Every route renders exactly one of these, which is what guarantees one h1
 *  per page. Phase 2 replaces the visual treatment, not the structure. */
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <Section>
      <Container>
        <h1 className="text-4xl font-semibold tracking-tight text-text sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">{description}</p>
      </Container>
    </Section>
  )
}
