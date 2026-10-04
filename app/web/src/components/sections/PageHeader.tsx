import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'

interface PageHeaderProps {
  title: string
  description: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <Section>
      <Container>
        <h1 className="text-display-md leading-tight font-semibold text-text">{title}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">{description}</p>
      </Container>
    </Section>
  )
}
