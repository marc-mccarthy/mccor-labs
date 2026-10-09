'use client'

import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react'

import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'
import {
  builderCopy,
  fillTemplate,
  statusCopy,
  stepLabel,
  verdictCopy,
  verdictPhrase,
} from '@/content/lab/copy'
import { MAX_STEPS } from '@/content/lab/limits'
import {
  classifyStep,
  type Answer,
  type Frequency,
  type QuestionKey,
  type RuleId,
} from '@/content/lab/rubric'

import { StepCard, type StepControl } from './StepCard'
import { VerdictCard } from './VerdictCard'
import { initialWorkflow, workflowReducer, type Step } from './workflowState'

const ADD_LIMIT_ID = 'lab-add-limit'

export interface WorkflowBuilderProps {
  readonly snippets: Readonly<Record<RuleId, ReactNode>>
}

interface Status {
  readonly text: string
  readonly seq: number
}

export function WorkflowBuilder({ snippets }: WorkflowBuilderProps) {
  const [state, dispatch] = useReducer(workflowReducer, undefined, initialWorkflow)
  const [openId, setOpenId] = useState<string | null>('step-1')
  const [status, setStatus] = useState<Status>({ text: '', seq: 0 })
  const [staggerIds] = useState<ReadonlySet<string>>(
    () => new Set(initialWorkflow().steps.map((step) => step.id)),
  )
  const controls = useRef(new Map<string, HTMLElement>())
  const pendingFocus = useRef<string | null>(null)
  const addRef = useRef<HTMLButtonElement>(null)

  const { steps } = state
  const atLimit = steps.length >= MAX_STEPS

  useEffect(() => {
    const target = pendingFocus.current
    if (target === null) return
    pendingFocus.current = null
    const element = target === 'add' ? addRef.current : controls.current.get(target)
    element?.focus()
  })

  function announce(text: string) {
    setStatus((previous) => ({ text, seq: previous.seq + 1 }))
  }

  function registerControl(
    stepId: string,
    control: StepControl,
    element: HTMLElement | null,
  ) {
    const key = `${stepId}:${control}`
    if (element === null) controls.current.delete(key)
    else controls.current.set(key, element)
  }

  function handleAdd() {
    if (atLimit) return
    const newId = `step-${String(state.nextId)}`
    dispatch({ type: 'add' })
    setOpenId(newId)
    pendingFocus.current = `${newId}:name`
    announce(fillTemplate(statusCopy.added, { step: stepLabel(steps.length + 1, '') }))
  }

  function handleRename(step: Step, name: string) {
    dispatch({ type: 'rename', id: step.id, name })
  }

  function handleAnswer(step: Step, position: number, key: QuestionKey, value: Answer) {
    const before = classifyStep(step.answers)
    const after = classifyStep({ ...step.answers, [key]: value })
    dispatch({ type: 'answer', id: step.id, key, value })
    if (before.verdict !== after.verdict || before.humanSignOff !== after.humanSignOff) {
      announce(
        fillTemplate(statusCopy.verdict, {
          step: stepLabel(position, step.name),
          verdict: verdictPhrase(after.verdict, after.humanSignOff),
        }),
      )
    }
  }

  function handleFrequency(step: Step, value: Frequency) {
    dispatch({ type: 'frequency', id: step.id, value })
  }

  function handleMove(step: Step, direction: 'up' | 'down') {
    dispatch({ type: 'move', id: step.id, direction })
  }

  function handleRemove(step: Step) {
    dispatch({ type: 'remove', id: step.id })
  }

  return (
    <Section aria-labelledby="lab-builder-heading">
      <Container>
        <h2 id="lab-builder-heading" className="font-display text-2xl">
          {builderCopy.heading}
        </h2>
        <p className="mt-2 text-muted">{builderCopy.intro}</p>
        <ol className="mt-6 flex flex-col gap-4">
          {steps.map((step, index) => {
            const position = index + 1
            const result = classifyStep(step.answers)
            const open = step.id === openId
            return (
              <StepCard
                key={step.id}
                step={step}
                position={position}
                total={steps.length}
                open={open}
                verdictLabel={verdictCopy[result.verdict].label}
                onToggle={() => {
                  setOpenId(open ? null : step.id)
                }}
                onRename={(name) => {
                  handleRename(step, name)
                }}
                onAnswer={(key, value) => {
                  handleAnswer(step, position, key, value)
                }}
                onFrequency={(value) => {
                  handleFrequency(step, value)
                }}
                onMove={(direction) => {
                  handleMove(step, direction)
                }}
                onRemove={() => {
                  handleRemove(step)
                }}
                controlRef={(control, element) => {
                  registerControl(step.id, control, element)
                }}
              >
                <VerdictCard
                  position={position}
                  name={step.name}
                  result={result}
                  answers={step.answers}
                  snippet={snippets[result.ruleId]}
                  revealOrder={staggerIds.has(step.id) ? index : 0}
                />
              </StepCard>
            )
          })}
        </ol>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            ref={addRef}
            variant="secondary"
            size="md"
            className="min-w-11"
            type="button"
            aria-disabled={atLimit ? 'true' : undefined}
            aria-describedby={atLimit ? ADD_LIMIT_ID : undefined}
            onClick={handleAdd}
          >
            {builderCopy.add}
          </Button>
          {atLimit ? (
            <p id={ADD_LIMIT_ID} className="text-sm text-muted">
              {builderCopy.addLimit}
            </p>
          ) : null}
        </div>
        <p role="status" data-lab-status className="sr-only">
          <span key={status.seq}>{status.text}</span>
        </p>
      </Container>
    </Section>
  )
}
