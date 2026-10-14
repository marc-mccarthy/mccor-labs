import { cn } from '@/lib/cn'

interface EyebrowProps {
  index: string
  label: string
  className?: string
}

export function Eyebrow({ index, label, className }: EyebrowProps) {
  return (
    <p
      className={cn(
        'mb-4 flex items-center gap-3 font-mono text-xs tracking-widest uppercase',
        className,
      )}
    >
      <span
        aria-hidden="true"
        data-testid="eyebrow-tick"
        className="h-px w-4 origin-left bg-brand motion-on:animate-[band-signal_var(--duration-standard)_var(--ease-standard)_both]"
      />
      <span className="text-text">{index}</span>
      <span aria-hidden="true" className="text-muted">
        /
      </span>
      <span className="text-muted">{label}</span>
    </p>
  )
}
