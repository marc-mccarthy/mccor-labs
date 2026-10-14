'use client'

import { useId } from 'react'
import { ui } from '@/content/ui'
import { useMotionPaused } from './MotionPauseProvider'

export function MotionPauseToggle() {
  const { paused, osReduced, toggle } = useMotionPaused()
  const hintId = useId()
  const pressed = paused || osReduced

  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={ui.pauseMotion}
      aria-disabled={osReduced ? true : undefined}
      aria-describedby={osReduced ? hintId : undefined}
      title={osReduced ? ui.pauseMotionSystemHint : undefined}
      onClick={toggle}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors duration-(--duration-pointer) ease-(--ease-pointer) hover:text-accent focus-visible:text-accent aria-disabled:hover:text-muted"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        {pressed ? (
          <path d="M4 2 L14 8 L4 14 Z" />
        ) : (
          <path d="M3 2 H6 V14 H3 Z M10 2 H13 V14 H10 Z" />
        )}
      </svg>
      {osReduced ? (
        <span id={hintId} hidden>
          {ui.pauseMotionSystemHint}
        </span>
      ) : null}
    </button>
  )
}
