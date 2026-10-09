import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { WorkflowBuilder } from '@/components/lab/WorkflowBuilder'
import { PageHeader } from '@/components/sections/PageHeader'
import { CodeBlock } from '@/components/substance/CodeBlock'
import { fillTemplate, labPageCopy, whyCopy } from '@/content/lab/copy'
import { RULE_IDS, RUBRIC_VERSION, type RuleId } from '@/content/lab/rubric'
import { readRuleSource } from '@/lib/ruleSource'

export const metadata: Metadata = {
  title: labPageCopy.title,
  description: labPageCopy.metaDescription,
}

async function buildSnippets(): Promise<Record<RuleId, ReactNode>> {
  const entries = await Promise.all(
    RULE_IDS.map(async (id) => {
      const block = await CodeBlock({
        code: readRuleSource(id),
        lang: 'typescript',
        filename: `rules/${id}.ts`,
        scrollLabel: fillTemplate(whyCopy.codeLabel, { rule: id }),
      })
      return [id, block] as const
    }),
  )
  return Object.fromEntries(entries) as Record<RuleId, ReactNode>
}

export default async function LabPage() {
  const snippets = await buildSnippets()

  return (
    <>
      <PageHeader
        title={labPageCopy.title}
        description={labPageCopy.headerDescription}
        image="/media/brand/systems-lattice.webp"
      />
      <Section aria-labelledby="lab-how-heading">
        <Container>
          <h2 id="lab-how-heading" className="sr-only">
            {labPageCopy.howItWorksHeading}
          </h2>
          <ol className="grid gap-4 font-mono text-sm text-muted sm:grid-cols-3">
            {labPageCopy.howItWorks.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </Container>
      </Section>
      <WorkflowBuilder snippets={snippets} />
      <Section aria-labelledby="lab-method-heading">
        <Container>
          <h2 id="lab-method-heading" className="font-display text-2xl">
            {labPageCopy.methodHeading}
          </h2>
          <p className="mt-2 max-w-2xl text-muted">{labPageCopy.methodBody}</p>
          <p className="mt-4 font-mono text-sm text-muted">
            {fillTemplate(labPageCopy.rubricVersion, { version: RUBRIC_VERSION })}
          </p>
        </Container>
      </Section>
    </>
  )
}
