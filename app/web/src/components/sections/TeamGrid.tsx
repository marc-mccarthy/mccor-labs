import type { CSSProperties } from 'react'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Stagger } from '@/components/motion/Stagger'
import { team } from '@/content/team'
import type { TeamMember } from '@/content/types'
import { portraits, type PortraitSlug } from '@/lib/portraits'

const PANEL_STYLE: CSSProperties = {
  backgroundColor: 'color-mix(in oklab, var(--color-brand) 12%, var(--color-base))',
  backgroundImage:
    'repeating-linear-gradient(135deg, color-mix(in oklab, var(--color-brand) 28%, var(--color-base)) 0 1px, transparent 1px 14px)',
}

function portraitFor(member: TeamMember) {
  return member.mediaSlot ? portraits[member.mediaSlot as PortraitSlug] : undefined
}

function Panel({ position }: { position: number }) {
  return (
    <div
      data-testid="team-panel"
      aria-hidden="true"
      style={PANEL_STYLE}
      className="relative flex aspect-[4/5] w-full items-end border border-border p-4"
    >
      <span className="font-mono text-6xl font-bold text-brand">
        {String(position).padStart(2, '0')}
      </span>
    </div>
  )
}

function Photo({ member, slug }: { member: TeamMember; slug: PortraitSlug }) {
  const portrait = portraits[slug]
  if (!portrait) return null
  return (
    <picture>
      <source type="image/avif" srcSet={`/${portrait.avif}`} />
      <source type="image/webp" srcSet={`/${portrait.webp}`} />
      <img
        src={`/${portrait.webp}`}
        alt={`Portrait of ${member.name}`}
        width={portrait.width}
        height={portrait.height}
        loading="lazy"
        decoding="async"
        className="h-auto w-full border border-border"
      />
    </picture>
  )
}

function Media({ member, position }: { member: TeamMember; position: number }) {
  return portraitFor(member) ? (
    <Photo member={member} slug={member.mediaSlot as PortraitSlug} />
  ) : (
    <Panel position={position} />
  )
}

export function TeamGrid() {
  return (
    <Section>
      <Container className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <Stagger>
          {team.map((member, index) => (
            <article key={member.slug} className="flex flex-col gap-4">
              <Media member={member} position={index + 1} />
              <h3 className="text-xl font-semibold text-text">{member.name}</h3>
              <p className="font-mono text-sm text-accent">{member.role}</p>
              <p className="text-sm text-muted">{member.bio}</p>
              <a
                href={`mailto:${member.email}`}
                className="font-mono text-sm text-accent"
              >
                {member.email}
              </a>
            </article>
          ))}
        </Stagger>
      </Container>
    </Section>
  )
}
