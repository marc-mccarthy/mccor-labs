'use client'

import { useId, type RefObject } from 'react'

import { Button } from '@/components/ui/button'
import { labLive } from '@/content/lab/copy'
import type { LaneState } from '@/lib/lab'

import { formatRecordedAt } from './useLabRun'

type ErrorReason = Extract<LaneState<never>, { status: 'error' }>['reason']
type RecordedState = Pick<
  Extract<LaneState<never>, { status: 'recorded' }>,
  'reason' | 'recordedAt'
>

const ERROR_TEXT: Readonly<Record<ErrorReason, string>> = {
  network: labLive.errorNetwork,
  server: labLive.errorServer,
  timeout: labLive.errorTimeout,
  validation: labLive.errorValidation,
}

const TRIGGER_CLASS = 'min-w-11 aria-disabled:opacity-50 aria-disabled:hover:bg-surface'

export function recordedLabel(state: RecordedState): string {
  const time = formatRecordedAt(state.recordedAt)
  if (state.reason === 'cap') return labLive.recordedCap(time)
  if (state.reason === 'off') return labLive.recordedOff(time)
  return labLive.recordedPreview(time)
}

export interface LaneTriggerProps {
  readonly label: string
  readonly runningLabel: string
  readonly running: boolean
  readonly disabledReason?: string
  readonly onRun: () => void
  readonly triggerRef: RefObject<HTMLButtonElement | null>
}

export function LaneTrigger({
  label,
  runningLabel,
  running,
  disabledReason,
  onRun,
  triggerRef,
}: LaneTriggerProps) {
  const reasonId = useId()
  const blocked = running || disabledReason !== undefined
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        ref={triggerRef}
        variant="secondary"
        size="md"
        className={TRIGGER_CLASS}
        type="button"
        aria-disabled={blocked ? 'true' : undefined}
        aria-describedby={disabledReason === undefined ? undefined : reasonId}
        onClick={() => {
          if (!blocked) onRun()
        }}
      >
        {running ? runningLabel : label}
      </Button>
      {disabledReason === undefined ? null : (
        <p id={reasonId} className="text-sm text-muted">
          {disabledReason}
        </p>
      )}
    </div>
  )
}

export interface LaneErrorProps {
  readonly reason: ErrorReason
  readonly onRetry?: () => void
  readonly validationText?: string
}

export function LaneError({ reason, onRetry, validationText }: LaneErrorProps) {
  const text =
    reason === 'validation' && validationText !== undefined
      ? validationText
      : ERROR_TEXT[reason]
  return (
    <div role="alert" className="space-y-3 text-sm">
      <p>{text}</p>
      {onRetry === undefined ? null : (
        <Button
          variant="secondary"
          size="md"
          className="min-w-11"
          type="button"
          onClick={onRetry}
        >
          {labLive.retry}
        </Button>
      )}
    </div>
  )
}

export function LaneBlocked() {
  return <p className="text-sm">{labLive.blocked}</p>
}
