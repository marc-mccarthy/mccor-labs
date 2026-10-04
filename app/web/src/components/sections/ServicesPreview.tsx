import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Stagger } from '@/components/motion/Stagger'
import { Card } from '@/components/ui/card'
import { SectionHeading } from '@/components/ui/section-heading'
import { services } from '@/content/services'
import { ui } from '@/content/ui'
import { cn } from '@/lib/cn'

const FEATURED_SLUG = 'ai-engineering'

export function ServicesPreview() {
  return (
    <Section>
      <Container>
        <SectionHeading>{ui.servicesHeading}</SectionHeading>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Stagger>
            {services.map((service) => {
              const featured = service.slug === FEATURED_SLUG
              return (
                <Card
                  key={service.slug}
                  data-service=""
                  data-featured={featured ? 'true' : undefined}
                  className={cn('h-full', featured && 'border-brand')}
                >
                  <h3 className="text-xl font-semibold text-text">
                    <Link
                      href={`/services/#${service.slug}`}
                      className="focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      {service.title}
                    </Link>
                  </h3>
                  <p className="mt-3 text-muted">{service.outcome}</p>
                </Card>
              )
            })}
          </Stagger>
        </div>
      </Container>
    </Section>
  )
}
