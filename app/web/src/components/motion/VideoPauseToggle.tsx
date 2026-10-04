import { ui } from '@/content/ui'

interface VideoPauseToggleProps {
  paused: boolean
  onToggle: () => void
}

export function VideoPauseToggle({ paused, onToggle }: VideoPauseToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={paused}
      aria-label={ui.pauseVideo}
      onClick={onToggle}
      className="absolute right-4 bottom-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-base/60 text-muted backdrop-blur transition-colors duration-(--duration-pointer) ease-(--ease-pointer) hover:text-accent focus-visible:text-accent"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        {paused ? (
          <path d="M4 2 L14 8 L4 14 Z" />
        ) : (
          <path d="M3 2 H6 V14 H3 Z M10 2 H13 V14 H10 Z" />
        )}
      </svg>
    </button>
  )
}
