import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { site } from '@/content/site'
import type { LegalBlock, LegalDocument } from '@/content/types'

function Text({ text }: { text: string }) {
  const parts = text.split(site.contactEmail)
  return parts.map((part, index) => (
    <span key={`${String(index)}-${part}`}>
      {index > 0 && (
        <a href={`mailto:${site.contactEmail}`} className="text-accent underline">
          {site.contactEmail}
        </a>
      )}
      {part}
    </span>
  ))
}

function Block({ block }: { block: LegalBlock }) {
  if (block.kind === 'h3') {
    return <h3 className="mt-4 text-xl font-semibold text-text">{block.text}</h3>
  }
  if (block.kind === 'ul') {
    return (
      <ul className="flex list-disc flex-col gap-2 pl-5 text-muted">
        {block.items.map((item) => (
          <li key={item}>
            <Text text={item} />
          </li>
        ))}
      </ul>
    )
  }
  return (
    <p className="text-muted">
      <Text text={block.text} />
    </p>
  )
}

export function LegalPage({ document }: { document: LegalDocument }) {
  return (
    <Section>
      <Container>
        <article className="flex max-w-prose flex-col gap-4 leading-relaxed">
          <h1 className="text-4xl font-semibold tracking-tight text-text sm:text-5xl">
            {document.title}
          </h1>
          <p className="text-muted">{document.description}</p>
          <p className="font-mono text-sm text-muted">Last updated: {document.updated}</p>
          {document.sections.map((section) => (
            <div key={section.heading} className="flex flex-col gap-4">
              <h2 className="mt-6 text-2xl font-semibold text-text">{section.heading}</h2>
              {section.blocks.map((block, index) => (
                <Block key={`${section.heading}-${String(index)}`} block={block} />
              ))}
            </div>
          ))}
        </article>
      </Container>
    </Section>
  )
}
