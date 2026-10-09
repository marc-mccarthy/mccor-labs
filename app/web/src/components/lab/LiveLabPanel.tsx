'use client'

import { useId, useState } from 'react'

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
import { RaceInputs, MIN_EXAMPLES, isRaceReady } from './RaceInputs'
import { RaceLane } from './RaceLane'
import { useLabRun } from './useLabRun'

export interface LiveLabStep {
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
}

interface ArgueBlockProps {
  readonly stepName: string
  readonly verdict: Verdict
  readonly onAnnounce: (text: string) => void
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
}: RaceBlockProps) {
  const { state, start } = useLabRun(
    'race',
    parseRaceResult,
    labLive.raceHeading,
    onAnnounce,
  )

  function run() {
    start({
      examples: examples.map(({ input, expected }) => ({
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
        examples={ranExamples(state, examples.length)}
      />
    </div>
  )
}

function ArgueBlock({ stepName, verdict, onAnnounce }: ArgueBlockProps) {
  const [typed, setTyped] = useState<string | null>(null)
  const summary = typed ?? stepName
  const { state, start } = useLabRun(
    'argue',
    parseArgueResult,
    labLive.argueHeading,
    onAnnounce,
  )

  return (
    <ArgueLane
      summary={summary}
      onSummaryChange={setTyped}
      verdict={verdict}
      state={state}
      onRun={() => {
        start({ stepSummary: summary.trim(), verdict })
      }}
    />
  )
}

export function LiveLabPanel({ steps, onAnnounce }: LiveLabPanelProps) {
  const [selected, setSelected] = useState(0)
  const [examples, setExamples] = useState<RaceExample[]>(emptyExamples)
  const headingId = useId()
  const pickerId = useId()
  const index = Math.min(selected, steps.length - 1)
  const step = steps[index]
  if (step === undefined) return null

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
            className="min-h-11 w-full max-w-md rounded-lg border border-border-strong bg-surface px-3 py-2 text-text"
            value={String(index)}
            onChange={(event) => {
              setSelected(Number(event.target.value))
            }}
          >
            {steps.map((item, at) => (
              <option key={at} value={String(at)}>
                {stepLabel(at + 1, item.name)}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <RaceBlock
            key={`race-${String(index)}`}
            examples={examples}
            onExamplesChange={setExamples}
            frequency={step.frequency}
            onAnnounce={onAnnounce}
          />
          <ArgueBlock
            key={`argue-${String(index)}`}
            stepName={step.name}
            verdict={step.verdict}
            onAnnounce={onAnnounce}
          />
        </div>
      </Container>
    </Section>
  )
}
