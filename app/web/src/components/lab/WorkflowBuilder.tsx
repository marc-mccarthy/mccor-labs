'use client'

import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'

import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'
import {
  builderCopy,
  fillTemplate,
  presets,
  presetsCopy,
  progressCopy,
  statusCopy,
  stepLabel,
  verdictCopy,
  verdictPhrase,
  type Preset,
} from '@/content/lab/copy'
import { MAX_STEPS } from '@/content/lab/limits'
import {
  classifyStep,
  type Answer,
  type Frequency,
  type QuestionKey,
  type RuleId,
} from '@/content/lab/rubric'
import { env } from '@/lib/env'

import { FeedbackMarksProvider } from './feedbackMarks'
import { LiveLabPanel } from './LiveLabPanel'
import { ProgressRail, summarize } from './ProgressRail'
import { SendResult } from './SendResult'
import { StepCard, type StepControl } from './StepCard'
import { SummaryTable } from './SummaryTable'
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
  const [staggerIds, setStaggerIds] = useState<ReadonlySet<string>>(
    () => new Set(initialWorkflow().steps.map((step) => step.id)),
  )
  const controls = useRef(new Map<string, HTMLElement>())
  const pendingFocus = useRef<string | null>(null)
  const addRef = useRef<HTMLButtonElement>(null)
  const undoRef = useRef<HTMLDivElement>(null)
  const [undoFocused, setUndoFocused] = useState(false)

  const { steps } = state
  const atLimit = steps.length >= MAX_STEPS
  const classified = steps.map((step) => ({
    answers: step.answers,
    result: classifyStep(step.answers),
  }))
  const progress = summarize(classified)

  useEffect(() => {
    const target = pendingFocus.current
    if (target === null) return
    pendingFocus.current = null
    const element = target === 'add' ? addRef.current : controls.current.get(target)
    element?.focus()
  })

  useEffect(() => {
    if (state.removed === null || undoFocused) return
    function expireUndo() {
      if (undoRef.current?.contains(document.activeElement)) {
        pendingFocus.current = 'add'
      }
      setUndoFocused(false)
      flushSync(() => {
        dispatch({ type: 'expire-undo' })
      })
    }
    const timer = window.setTimeout(expireUndo, 10_000)
    return () => {
      window.clearTimeout(timer)
    }
  }, [state.removed, undoFocused])

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

  function handleMove(step: Step, position: number, direction: 'up' | 'down') {
    const newPosition = direction === 'up' ? position - 1 : position + 1
    if (newPosition < 1 || newPosition > steps.length) return
    dispatch({ type: 'move', id: step.id, direction })
    pendingFocus.current = `${step.id}:${direction === 'up' ? 'up' : 'down'}`
    announce(
      fillTemplate(direction === 'up' ? statusCopy.movedUp : statusCopy.movedDown, {
        step: stepLabel(newPosition, step.name),
      }),
    )
  }

  function handleRemove(step: Step, position: number) {
    dispatch({ type: 'remove', id: step.id })
    setUndoFocused(false)
    const next = steps.filter((s) => s.id !== step.id)[position - 1]
    if (next === undefined) {
      pendingFocus.current = 'add'
    } else {
      setOpenId(next.id)
      pendingFocus.current = `${next.id}:name`
    }
    announce(fillTemplate(statusCopy.removed, { step: stepLabel(position, step.name) }))
  }

  function undo() {
    const next = workflowReducer(state, { type: 'undo' })
    if (next === state || state.removed === null) return
    const { step, index } = state.removed
    dispatch({ type: 'undo' })
    setUndoFocused(false)
    setOpenId(step.id)
    pendingFocus.current = `${step.id}:name`
    announce(fillTemplate(statusCopy.restored, { step: stepLabel(index + 1, step.name) }))
  }

  function loadPreset(preset: Preset) {
    const firstId = state.nextId
    dispatch({ type: 'load', seeds: preset.steps })
    const ids = preset.steps
      .slice(0, MAX_STEPS)
      .map((_step, offset) => `step-${String(firstId + offset)}`)
    setOpenId(`step-${String(firstId)}`)
    setStaggerIds(new Set(ids))
    setUndoFocused(false)
    announce(fillTemplate(statusCopy.loaded, { preset: preset.title, count: ids.length }))
  }

  function pauseUndo() {
    setUndoFocused(true)
  }

  function resumeUndo(event: FocusEvent<HTMLDivElement>) {
    const target = event.relatedTarget
    if (target instanceof Node && event.currentTarget.contains(target)) return
    setUndoFocused(false)
  }

  return (
    <FeedbackMarksProvider>
      <Section aria-labelledby="lab-presets-heading">
        <Container>
          <h2 id="lab-presets-heading" className="font-display text-2xl">
            {presetsCopy.heading}
          </h2>
          <p className="mt-2 text-muted">{presetsCopy.intro}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {presets.map((preset) => (
              <Button
                key={preset.id}
                variant="secondary"
                size="md"
                className="min-w-11"
                type="button"
                onClick={() => {
                  loadPreset(preset)
                }}
              >
                {fillTemplate(presetsCopy.load, { preset: preset.title })}
              </Button>
            ))}
          </div>
        </Container>
      </Section>
      <Section aria-labelledby="lab-builder-heading">
        <Container>
          <h2 id="lab-builder-heading" className="font-display text-2xl">
            {builderCopy.heading}
          </h2>
          <p className="mt-2 text-muted">{builderCopy.intro}</p>
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
            <div>
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
                        handleMove(step, position, direction)
                      }}
                      onRemove={() => {
                        handleRemove(step, position)
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
              {state.removed !== null && steps.length < MAX_STEPS ? (
                <div ref={undoRef} data-undo onFocus={pauseUndo} onBlur={resumeUndo}>
                  <p>{builderCopy.removedNotice}</p>
                  <Button
                    variant="link"
                    size="md"
                    className="min-w-11"
                    type="button"
                    onClick={undo}
                  >
                    {builderCopy.undo}
                  </Button>
                </div>
              ) : null}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  ref={addRef}
                  variant="secondary"
                  size="md"
                  className="min-w-11 aria-disabled:opacity-50 aria-disabled:hover:bg-surface"
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
            </div>
            <aside
              aria-label={progressCopy.heading}
              data-sticky-layout
              className="mt-10 self-start lg:sticky lg:top-24 lg:mt-0"
            >
              <ProgressRail {...progress} />
            </aside>
          </div>
        </Container>
      </Section>
      <SummaryTable
        rows={steps.map((step, index) => ({
          position: index + 1,
          name: step.name,
          result: classifyStep(step.answers),
        }))}
      />
      {env.labLive && (
        <LiveLabPanel
          steps={steps.map((step) => ({
            id: step.id,
            name: step.name,
            verdict: classifyStep(step.answers).verdict,
            frequency: step.answers.frequency,
          }))}
          onAnnounce={announce}
        />
      )}
      <SendResult
        steps={steps.map((step) => ({
          name: step.name,
          result: classifyStep(step.answers),
          answers: step.answers,
        }))}
      />
    </FeedbackMarksProvider>
  )
}
