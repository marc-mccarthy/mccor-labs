import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Reveal } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/button'
import { site } from '@/content/site'
import type { Role } from '@/content/types'

export function RoleBlock({ role }: { role: Role }) {
  const href = `mailto:${site.contactEmail}?subject=${encodeURIComponent(role.applySubject)}`

  return (
    <Section>
      <Container>
        <Reveal>
          <article className="flex flex-col gap-6">
            <p className="font-mono text-sm text-accent">{role.level}</p>
            <h2 className="text-display-sm leading-tight font-semibold tracking-tight text-text">
              {role.title}
            </h2>
            <p className="max-w-2xl text-lg text-muted">{role.summary}</p>
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="text-xl font-semibold text-text">You will</h3>
                <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-muted">
                  {role.youWillDo.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-text">We are looking for</h3>
                <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-muted">
                  {role.weAreLookingFor.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <Button asChild>
                <a href={href}>Apply for {role.title}</a>
              </Button>
            </div>
          </article>
        </Reveal>
      </Container>
    </Section>
  )
}
