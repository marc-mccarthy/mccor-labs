import type { Metadata } from 'next'

import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { RunHistory } from '@/components/lab/evals/RunHistory'
import { RunSummary } from '@/components/lab/evals/RunSummary'
import { PageHeader } from '@/components/sections/PageHeader'
import { fillTemplate } from '@/content/lab/copy'
import { TRACE_DIR, loadTraces } from '@/content/lab/evals'
import { evalsCopy } from '@/content/lab/evalsCopy'
import { RUBRIC_VERSION } from '@/content/lab/rubric'

export const metadata: Metadata = {
  title: evalsCopy.title,
  description: evalsCopy.description,
}

export default function EvalsPage() {
  const traces = loadTraces(TRACE_DIR)

  return (
    <>
      <PageHeader title={evalsCopy.title} description={evalsCopy.description} />
      <RunSummary trace={traces[0] ?? null} />
      <RunHistory traces={traces} />
      <Section aria-labelledby="evals-method-heading">
        <Container>
          <h2 id="evals-method-heading" className="font-display text-2xl">
            {evalsCopy.methodHeading}
          </h2>
          <div className="mt-2 grid max-w-2xl gap-3 text-muted">
            {evalsCopy.method.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <p className="mt-4 font-mono text-sm text-muted">
            {fillTemplate(evalsCopy.rubricVersion, { version: RUBRIC_VERSION })}
          </p>
        </Container>
      </Section>
    </>
  )
}
