import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Parallax } from '@/components/motion/Parallax'

interface PageHeaderProps {
  title: string
  description: string
  image?: string
}

export function PageHeader({ title, description, image }: PageHeaderProps) {
  const text = (
    <Container className="relative">
      <h1 className="text-display-md leading-tight font-semibold text-text">{title}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">{description}</p>
    </Container>
  )

  if (!image) return <Section>{text}</Section>

  return (
    <Section className="relative flex min-h-[60vh] items-end overflow-hidden pb-0 sm:pb-0">
      <div className="absolute inset-0 mask-t-from-80% mask-b-from-45% *:h-full">
        <Parallax speed={0.15}>
          <img
            src={image}
            alt=""
            fetchPriority="high"
            decoding="async"
            data-testid="header-image"
            className="h-full w-full object-cover object-right"
          />
        </Parallax>
      </div>
      <div className="absolute inset-0 bg-linear-to-t from-base via-base/80 to-transparent sm:bg-linear-to-r sm:via-base/70" />
      {text}
    </Section>
  )
}
