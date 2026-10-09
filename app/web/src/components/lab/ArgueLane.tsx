'use client'

import { useId, useRef } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { labLive, verdictCopy } from '@/content/lab/copy'
import type { Verdict } from '@/content/lab/rubric'
import type { ArgueResult, LaneState } from '@/lib/lab'

import { CostLine } from './CostLine'
import { LaneBlocked, LaneError, LaneTrigger, recordedLabel } from './LaneParts'
import { VERDICT_STYLE } from './verdictStyle'

export interface ArgueLaneProps {
  readonly summary: string
  readonly onSummaryChange: (value: string) => void
  readonly verdict: Verdict
  readonly state: LaneState<ArgueResult>
  readonly onRun: () => void
  readonly recordedSummary?: string
}

const FIELD =
  'min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-text'

export function ArgueLane({
  summary,
  onSummaryChange,
  verdict,
  state,
  onRun,
  recordedSummary,
}: ArgueLaneProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const baseId = useId()
  const inputId = `${baseId}-summary`
  const noticeId = `${baseId}-notice`
  const headingId = `${baseId}-heading`
  const running = state.status === 'running'

  function retry() {
    triggerRef.current?.focus()
    if (!running) onRun()
  }

  return (
    <Card className="space-y-4">
      <div>
        <label htmlFor={inputId} className="mb-1 block text-sm text-text">
          {labLive.argueInputLabel}
        </label>
        <textarea
          id={inputId}
          rows={3}
          maxLength={300}
          className={FIELD}
          value={summary}
          aria-describedby={noticeId}
          onChange={(event) => {
            onSummaryChange(event.target.value)
          }}
        />
        <p id={noticeId} className="mt-1 text-sm text-muted">
          {labLive.inputNotice}
        </p>
      </div>
      <LaneTrigger
        label={labLive.argueButton}
        runningLabel={labLive.arguing}
        running={running}
        onRun={onRun}
        triggerRef={triggerRef}
      />
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{labLive.argueVerdictLabel}</span>
        <Badge variant={verdict}>
          <span aria-hidden="true" className={VERDICT_STYLE[verdict].marker} />
          {verdictCopy[verdict].label}
        </Badge>
      </p>
      {state.status === 'blocked' ? <LaneBlocked /> : null}
      {state.status === 'error' ? (
        <LaneError reason={state.reason} onRetry={retry} />
      ) : null}
      {state.status === 'running' ||
      state.status === 'live' ||
      state.status === 'recorded' ? (
        <section aria-labelledby={headingId} aria-busy={running} className="space-y-4">
          <h3 id={headingId} className="font-display text-xl">
            {labLive.argueHeading}
          </h3>
          {state.status === 'recorded' ? (
            <>
              <p className="text-sm text-muted">{recordedLabel(state)}</p>
              {recordedSummary === undefined ? null : (
                <p className="text-sm text-muted">
                  {labLive.recordedArgueFor(recordedSummary)}
                </p>
              )}
            </>
          ) : null}
          {state.status === 'live' || state.status === 'recorded' ? (
            <>
              <p className="font-mono text-sm text-muted">{labLive.argueAttribution}</p>
              <p className="rounded-lg bg-elevated p-4 whitespace-pre-wrap">
                {state.result.text}
              </p>
              <CostLine
                costUsd={state.result.costUsd}
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
