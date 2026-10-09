'use client'

import Link from 'next/link'
import { useState } from 'react'

import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'
import { sendCopy } from '@/content/lab/copy'
import type { RubricResult, StepAnswers } from '@/content/lab/rubric'
import { encodeLabResult, formatLabResult, toLabResult } from '@/lib/labResult'

export interface SendResultProps {
  readonly steps: readonly {
    name: string
    result: RubricResult
    answers: StepAnswers
  }[]
}

export function SendResult({ steps }: SendResultProps) {
  const [includeNames, setIncludeNames] = useState(false)
  const result = toLabResult(steps, includeNames)

  return (
    <Section aria-labelledby="lab-send-heading">
      <Container>
        <h2 id="lab-send-heading" className="font-display text-2xl">
          {sendCopy.heading}
        </h2>
        <p className="mt-2 text-muted">{sendCopy.body}</p>
        <label className="mt-4 flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            className="size-5"
            checked={includeNames}
            onChange={(event) => {
              setIncludeNames(event.target.checked)
            }}
          />
          {sendCopy.includeNames}
        </label>
        <figure className="mt-4">
          <figcaption className="text-sm text-muted">{sendCopy.previewLabel}</figcaption>
          <pre className="mt-2 rounded-lg border border-border bg-surface p-4 font-mono text-sm whitespace-pre-wrap">
            {formatLabResult(result)}
          </pre>
        </figure>
        <div className="mt-6">
          <Button asChild size="md" className="min-w-11">
            <Link href={`/contact/#lab=${encodeLabResult(result)}`}>
              {sendCopy.button}
            </Link>
          </Button>
        </div>
      </Container>
    </Section>
  )
}
