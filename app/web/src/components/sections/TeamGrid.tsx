import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Stagger } from '@/components/motion/Stagger'
import { team } from '@/content/team'
import type { TeamMember } from '@/content/types'
import { portraits, type PortraitSlug } from '@/lib/portraits'

function Photo({ member }: { member: TeamMember }) {
  const portrait = member.mediaSlot
    ? portraits[member.mediaSlot as PortraitSlug]
    : undefined
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

export function TeamGrid() {
  return (
    <Section>
      <Container className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <Stagger>
          {team.map((member) => (
            <article key={member.slug} className="flex flex-col gap-4">
              <Photo member={member} />
              <h2 className="text-xl font-semibold text-text">{member.name}</h2>
              <p className="font-mono text-sm text-muted">{member.role}</p>
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
