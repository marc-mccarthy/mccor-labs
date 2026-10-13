'use client'

import { useEffect, useId, useState } from 'react'

import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { labLive, stepLabel } from '@/content/lab/copy'
import type { Frequency, Verdict } from '@/content/lab/rubric'
import {
  parseArgueResult,
  parseRaceResult,
  type LaneState,
  type RaceExample,
  type RaceResult,
} from '@/lib/lab'

import { ArgueLane } from './ArgueLane'
import { MIN_EXAMPLES, RaceInputs, filledExamples, isRaceReady } from './RaceInputs'
import { RaceLane } from './RaceLane'
import { useLabRun } from './useLabRun'

export interface LiveLabStep {
  readonly id: string
  readonly name: string
  readonly verdict: Verdict
  readonly frequency: Frequency
}

export interface LiveLabPanelProps {
  readonly steps: readonly LiveLabStep[]
  readonly onAnnounce: (text: string) => void
}

interface RaceBlockProps {
  readonly examples: readonly RaceExample[]
  readonly onExamplesChange: (next: RaceExample[]) => void
  readonly frequency: Frequency
  readonly onAnnounce: (text: string) => void
  readonly onRunningChange: (running: boolean) => void
}

interface ArgueBlockProps {
  readonly stepName: string
  readonly verdict: Verdict
  readonly onAnnounce: (text: string) => void
  readonly onRunningChange: (running: boolean) => void
}

function useReportRunning(
  running: boolean,
  onRunningChange: (running: boolean) => void,
): void {
  useEffect(() => {
    onRunningChange(running)
    return () => {
      onRunningChange(false)
    }
  }, [running, onRunningChange])
}

function emptyExamples(): RaceExample[] {
  return Array.from({ length: MIN_EXAMPLES }, () => ({ input: '', expected: '' }))
}

function ranExamples(state: LaneState<RaceResult>, fallback: number): number {
  return state.status === 'live' || state.status === 'recorded'
    ? state.result.model.total
    : fallback
}

function RaceBlock({
  examples,
  onExamplesChange,
  frequency,
  onAnnounce,
  onRunningChange,
}: RaceBlockProps) {
  const { state, start } = useLabRun(
    'race',
    parseRaceResult,
    labLive.raceHeading,
    onAnnounce,
  )
  useReportRunning(state.status === 'running', onRunningChange)

  function run() {
    start({
      examples: filledExamples(examples).map(({ input, expected }) => ({
        input: input.trim(),
        expected: expected.trim(),
      })),
    })
  }

  return (
    <div className="space-y-4">
      <RaceInputs examples={examples} onChange={onExamplesChange} />
      <RaceLane
        state={state}
        onRun={run}
        disabledReason={isRaceReady(examples) ? undefined : labLive.raceNeedsExamples}
        frequency={frequency}
        examples={ranExamples(state, filledExamples(examples).length)}
      />
    </div>
  )
}

function ArgueBlock({ stepName, verdict, onAnnounce, onRunningChange }: ArgueBlockProps) {
  const [typed, setTyped] = useState<string | null>(null)
  const summary = typed ?? stepName
  const { state, start } = useLabRun(
    'argue',
    parseArgueResult,
    labLive.argueHeading,
    onAnnounce,
  )
  useReportRunning(state.status === 'running', onRunningChange)

  return (
    <ArgueLane
      summary={summary}
      onSummaryChange={setTyped}
      verdict={verdict}
      state={state}
      disabledReason={summary.trim() === '' ? labLive.argueDisabledNoName : undefined}
      onRun={() => {
        start({ stepSummary: summary.trim(), verdict })
      }}
    />
  )
}

export function LiveLabPanel({ steps, onAnnounce }: LiveLabPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [examples, setExamples] = useState<RaceExample[]>(emptyExamples)
  const [raceRunning, setRaceRunning] = useState(false)
  const [argueRunning, setArgueRunning] = useState(false)
  const headingId = useId()
  const pickerId = useId()
  const busyId = useId()
  const step = steps.find((item) => item.id === selectedId) ?? steps[0]
  if (step === undefined) return null
  const busy = raceRunning || argueRunning

  return (
    <Section aria-labelledby={headingId}>
      <Container>
        <h2 id={headingId} className="font-display text-2xl">
          {labLive.panelHeading}
        </h2>
        <div className="mt-4">
          <label htmlFor={pickerId} className="mb-1 block text-sm text-text">
            {labLive.stepPicker}
          </label>
          <select
            id={pickerId}
            className="min-h-11 w-full max-w-md rounded-lg border border-border-strong bg-surface px-3 py-2 text-text aria-disabled:opacity-50"
            value={step.id}
            aria-disabled={busy ? 'true' : undefined}
            aria-describedby={busy ? busyId : undefined}
            onChange={(event) => {
              if (!busy) setSelectedId(event.target.value)
            }}
          >
            {steps.map((item, at) => (
              <option key={item.id} value={item.id}>
                {stepLabel(at + 1, item.name)}
              </option>
            ))}
          </select>
          {busy ? (
            <p id={busyId} className="mt-1 text-sm text-muted">
              {labLive.stepPickerBusy}
            </p>
          ) : null}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <RaceBlock
            key={`race-${step.id}`}
            examples={examples}
            onExamplesChange={setExamples}
            frequency={step.frequency}
            onAnnounce={onAnnounce}
            onRunningChange={setRaceRunning}
          />
          <ArgueBlock
            key={`argue-${step.id}-${step.verdict}`}
            stepName={step.name}
            verdict={step.verdict}
            onAnnounce={onAnnounce}
            onRunningChange={setArgueRunning}
          />
        </div>
      </Container>
    </Section>
  )
}
