'use client'

import { useId, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  answerCopy,
  fillTemplate,
  questionCopy,
  stepLabel,
  whyCopy,
} from '@/content/lab/copy'
import { getRule, type RubricResult, type StepAnswers } from '@/content/lab/rubric'

export interface WhyDrawerProps {
  readonly position: number
  readonly name: string
  readonly result: RubricResult
  readonly answers: StepAnswers
  readonly snippet: ReactNode
}

export function WhyDrawer({ position, name, result, answers, snippet }: WhyDrawerProps) {
  const [open, setOpen] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)
  const panelId = useId()
  const codeId = useId()

  return (
    <div>
      <Button
        type="button"
        variant="link"
        size="md"
        className="min-w-11"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((current) => !current)
        }}
      >
        {whyCopy.button}{' '}
        <span className="sr-only">
          {fillTemplate(whyCopy.forStep, { step: stepLabel(position, name) })}
        </span>
      </Button>
      <div id={panelId} hidden={!open} className="mt-3 space-y-3">
        <p>{result.why}</p>
        <p>{whyCopy.triggered}</p>
        <dl className="space-y-1 text-sm">
          {getRule(result.ruleId).reads.map((key) => {
            const answer = answers[key]
            return (
              <div key={key} className="flex gap-2">
                <dt className="text-muted">{questionCopy[key].short}</dt>
                <dd>{answer === null ? answerCopy.unanswered : answerCopy[answer]}</dd>
              </div>
            )
          })}
        </dl>
        <p className="font-mono text-sm text-muted">
          {fillTemplate(whyCopy.ruleLine, {
            rule: result.ruleId,
            version: result.rubricVersion,
          })}
        </p>
        <Button
          type="button"
          variant="link"
          size="md"
          className="min-w-11"
          aria-expanded={codeOpen}
          aria-controls={codeId}
          onClick={() => {
            setCodeOpen((current) => !current)
          }}
        >
          {whyCopy.showCode}
        </Button>
        <div id={codeId} hidden={!codeOpen}>
          {snippet}
        </div>
      </div>
    </div>
  )
}
