import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Spotlight } from '@/components/motion/Spotlight'
import { Reveal } from '@/components/motion/Reveal'
import { Card } from '@/components/ui/card'
import { GlowField } from '@/components/ui/glow-field'
import { SectionHeading } from '@/components/ui/section-heading'
import { services } from '@/content/services'
import { ui } from '@/content/ui'
import { cn } from '@/lib/cn'

const FEATURED_SLUG = 'ai-engineering'

const CARD_INTERACTION = [
  'hover:border-border-strong',
  'motion-on:hover:[transform:translateY(-0.125rem)]',
  'motion-on:active:[transform:translateY(0)_scale(0.99)]',
  'motion-on:transition-[transform,border-color] motion-on:duration-(--duration-pointer) motion-on:ease-(--ease-pointer)',
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent has-[:focus-visible]:outline-offset-2',
  'has-[:focus-visible]:shadow-[0_0_0_4px_var(--color-base)]',
].join(' ')

const FEATURED_HAIRLINE = [
  'before:pointer-events-none before:absolute before:-inset-px before:rounded-[inherit] before:p-px',
  'before:bg-brand before:opacity-0 hover:before:opacity-100',
  'before:[mask:linear-gradient(var(--color-base)_0_0)_content-box,linear-gradient(var(--color-base)_0_0)]',
  'before:[mask-composite:exclude]',
].join(' ')

const FEATURED_ITEM = 'sm:col-span-2 lg:col-span-1 lg:row-span-2'
const STAGGER_INTERVAL_SECONDS = 0.08

export function ServicesPreview() {
  return (
    <Section className="relative isolate pt-12 sm:pt-16">
      <GlowField anchor="right" />
      <Container>
        <SectionHeading words eyebrow={{ index: '01', label: ui.eyebrows.services }}>
          {ui.servicesHeading}
        </SectionHeading>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
          {services.map((service, index) => {
            const featured = service.slug === FEATURED_SLUG
            return (
              <Reveal
                key={service.slug}
                delay={STAGGER_INTERVAL_SECONDS * index}
                className={featured ? FEATURED_ITEM : undefined}
              >
                <Card
                  data-service=""
                  data-featured={featured ? 'true' : undefined}
                  className={cn(
                    'group relative isolate h-full',
                    CARD_INTERACTION,
                    featured && FEATURED_HAIRLINE,
                  )}
                >
                  {featured && <GlowField anchor="right" />}
                  <Spotlight />
                  {featured && (
                    <p className="font-mono text-xs tracking-widest text-muted uppercase">
                      {ui.featured}
                    </p>
                  )}
                  <h3 className="text-xl font-semibold text-text">
                    <Link
                      href={`/services/#${service.slug}`}
                      className="after:absolute after:inset-0 after:rounded-[inherit] focus-visible:shadow-none focus-visible:outline-none"
                    >
                      {service.title}
                    </Link>
                  </h3>
                  <p className="mt-3 text-muted">{service.outcome}</p>
                </Card>
              </Reveal>
            )
          })}
        </div>
      </Container>
    </Section>
  )
}
