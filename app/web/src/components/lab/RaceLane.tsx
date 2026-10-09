'use client'

import { useId, useRef } from 'react'

import { Card } from '@/components/ui/card'
import { labLive } from '@/content/lab/copy'
import type { Frequency } from '@/content/lab/rubric'
import type { LaneState, RaceResult } from '@/lib/lab'
import { formatMs, formatTokens, formatUsd, type Formatted } from '@/lib/labCost'

import { CostLine } from './CostLine'
import { LaneBlocked, LaneError, LaneTrigger, recordedLabel } from './LaneParts'

export interface RaceLaneProps {
  readonly state: LaneState<RaceResult>
  readonly onRun?: () => void
  readonly disabledReason?: string
  readonly frequency?: Frequency
  readonly examples?: number
}

const NUMBER_CELL = 'px-3 py-2 font-mono tabular-nums text-right'

function Measure({ value }: { readonly value: Formatted }) {
  return (
    <>
      <span>{value.value}</span> <span className="text-muted">{value.unit}</span>
    </>
  )
}

function RaceTable({ result }: { readonly result: RaceResult }) {
  const { model, program } = result
  return (
    <table className="w-full border-collapse text-left text-sm">
      <caption className="pb-2 text-left font-mono text-muted">
        {labLive.measured}
      </caption>
      <thead>
        <tr className="border-b border-border-strong">
          <th scope="col" className="px-3 py-2 font-medium">
            {labLive.columns.lane}
          </th>
          <th scope="col" className={NUMBER_CELL}>
            {labLive.columns.accuracy}
          </th>
          <th scope="col" className={NUMBER_CELL}>
            {labLive.columns.time}
          </th>
          <th scope="col" className={NUMBER_CELL}>
            {labLive.columns.tokens}
          </th>
          <th scope="col" className={NUMBER_CELL}>
            {labLive.columns.cost}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-border">
          <th scope="row" className="px-3 py-3 font-medium">
            {result.modelLabel}
          </th>
          <td className={NUMBER_CELL}>{labLive.accuracy(model.correct, model.total)}</td>
          <td className={NUMBER_CELL}>
            <Measure value={formatMs(model.ms)} />
          </td>
          <td className={NUMBER_CELL}>
            <Measure value={formatTokens(model.inputTokens + model.outputTokens)} />
          </td>
          <td className={NUMBER_CELL}>
            <Measure value={formatUsd(model.costUsd)} />
          </td>
        </tr>
        <tr className="border-b border-border">
          <th scope="row" className="px-3 py-3 font-medium">
            {labLive.laneProgram}
          </th>
          <td className={NUMBER_CELL}>
            {labLive.accuracy(program.correct, program.total)}
          </td>
          <td className={NUMBER_CELL}>
            <Measure value={formatMs(program.ms)} />
          </td>
          <td className={NUMBER_CELL}>-</td>
          <td className={NUMBER_CELL}>
            <Measure value={formatUsd(program.costUsd)} />
          </td>
        </tr>
      </tbody>
    </table>
  )
}

export function RaceLane({
  state,
  onRun,
  disabledReason,
  frequency,
  examples,
}: RaceLaneProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const headingId = useId()
  const running = state.status === 'running'
  const blocked = running || disabledReason !== undefined

  function run() {
    if (onRun !== undefined && !blocked) onRun()
  }

  function retry() {
    triggerRef.current?.focus()
    run()
  }

  return (
    <Card className="space-y-4">
      {onRun === undefined ? null : (
        <LaneTrigger
          label={labLive.raceButton}
          runningLabel={labLive.racing}
          running={running}
          disabledReason={disabledReason}
          onRun={run}
          triggerRef={triggerRef}
        />
      )}
      {state.status === 'blocked' ? <LaneBlocked /> : null}
      {state.status === 'error' ? (
        <LaneError
          reason={state.reason}
          onRetry={onRun === undefined ? undefined : retry}
        />
      ) : null}
      {state.status === 'running' ||
      state.status === 'live' ||
      state.status === 'recorded' ? (
        <section aria-labelledby={headingId} aria-busy={running} className="space-y-4">
          <h3 id={headingId} className="font-display text-xl">
            {labLive.raceHeading}
          </h3>
          {state.status === 'recorded' ? (
            <p className="text-sm text-muted">{recordedLabel(state)}</p>
          ) : null}
          {state.status === 'live' || state.status === 'recorded' ? (
            <>
              <RaceTable result={state.result} />
              <CostLine
                costUsd={state.result.model.costUsd}
                examples={examples}
                frequency={frequency}
                pricesAsOf={state.result.pricesAsOf}
                runsLeft={state.runsLeft}
                recorded={state.status === 'recorded'}
              />
            </>
          ) : null}
        </section>
      ) : null}
    </Card>
  )
}
