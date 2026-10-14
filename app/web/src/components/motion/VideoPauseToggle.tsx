'use client'

import { ui } from '@/content/ui'
import { useMotionPausedFlag } from './MotionPauseProvider'

interface VideoPauseToggleProps {
  paused: boolean
  onToggle: () => void
}

export function VideoPauseToggle({ paused, onToggle }: VideoPauseToggleProps) {
  const pagePaused = useMotionPausedFlag()
  const pressed = paused || pagePaused

  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={ui.pauseVideo}
      aria-disabled={pagePaused ? true : undefined}
      onClick={pagePaused ? undefined : onToggle}
      className="absolute right-4 bottom-4 z-20 inline-flex h-11 w-11 press items-center justify-center rounded-full border border-border bg-base/60 text-muted backdrop-blur hover:text-accent focus-visible:text-accent aria-disabled:cursor-not-allowed aria-disabled:hover:text-muted aria-pressed:border-accent"
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
    </button>
  )
}
