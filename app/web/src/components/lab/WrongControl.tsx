'use client'

import { useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  FEEDBACK_REASONS,
  feedbackCopy,
  type FeedbackReasonId,
} from '@/content/lab/feedback'
import type { RuleId, Verdict } from '@/content/lab/rubric'
import { cn } from '@/lib/cn'
import { sendFeedback } from '@/lib/feedback'

import { VERDICT_STYLE } from './verdictStyle'

const OPTION =
  'flex min-h-11 min-w-11 items-center gap-2 rounded-lg border border-border-strong px-3 has-checked:font-semibold'
const RADIO =
  'size-5 appearance-none rounded-full border-2 border-border-strong checked:border-[6px] checked:border-text'
const DISABLED_SEND = 'min-w-11 aria-disabled:opacity-50 aria-disabled:hover:bg-accent'

type Phase = 'idle' | 'sending' | 'error' | 'sent' | 'daily_cap'

export interface WrongControlProps {
  readonly verdict: Verdict
  readonly ruleId: RuleId
  readonly rubricVersion: string
  readonly stepLabel: string
  readonly alreadySent: boolean
  readonly onSent: () => void
}

export function WrongControl({
  verdict,
  ruleId,
  rubricVersion,
  stepLabel,
  alreadySent,
  onSent,
}: WrongControlProps) {
  const id = useId()
  const panelId = `${id}-panel`
  const hintId = `${id}-hint`
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<FeedbackReasonId | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [attempted, setAttempted] = useState(false)
  const inFlight = useRef(false)
  const confirmRef = useRef<HTMLParagraphElement>(null)

  const final = phase === 'sent' || phase === 'daily_cap'

  useEffect(() => {
    if (final) confirmRef.current?.focus()
  }, [final])

  if (final || alreadySent) {
    return (
      <p ref={confirmRef} tabIndex={-1} className="mt-4 text-sm text-muted">
        {phase === 'daily_cap' ? feedbackCopy.dailyCap : feedbackCopy.sent}
      </p>
    )
  }

  const fill = VERDICT_STYLE[verdict].card.includes('bg-elevated')
    ? 'has-checked:bg-surface'
    : 'has-checked:bg-elevated'
  const sending = phase === 'sending'
  const hintShown = attempted && reason === null

  async function submit() {
    if (sending || inFlight.current) return
    if (reason === null) {
      setAttempted(true)
      return
    }
    inFlight.current = true
    setPhase('sending')
    const outcome = await sendFeedback({
      verdictId: verdict,
      ruleId,
      rubricVersion,
      reason,
    })
    inFlight.current = false
    setPhase(outcome)
    if (outcome === 'sent') onSent()
  }

  return (
    <div className="mt-4">
      <Button
        type="button"
        variant="secondary"
        size="md"
        className="min-w-11"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((previous) => !previous)
        }}
      >
        {feedbackCopy.toggle} <span className="sr-only">{stepLabel}</span>
      </Button>
      <div id={panelId} hidden={!open} className="mt-3">
        <fieldset className="min-w-0">
          <legend className="mb-2 font-medium">{feedbackCopy.legend}</legend>
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_REASONS.map((option) => (
              <label key={option.id} className={cn(OPTION, fill)}>
                <input
                  type="radio"
                  className={RADIO}
                  name={`${id}-reason`}
                  value={option.id}
                  checked={reason === option.id}
                  onChange={() => {
                    setReason(option.id)
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="mt-3 text-sm text-muted">{feedbackCopy.note}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="md"
            className={DISABLED_SEND}
            aria-disabled={reason === null || sending}
            aria-describedby={hintShown ? hintId : undefined}
            onClick={() => {
              void submit()
            }}
          >
            {sending ? feedbackCopy.sending : feedbackCopy.send}
          </Button>
          {hintShown ? (
            <p id={hintId} className="text-sm text-muted">
              {feedbackCopy.pickFirst}
            </p>
          ) : null}
        </div>
        {phase === 'error' ? (
          <p role="alert" className="mt-3 text-sm">
            {feedbackCopy.error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
