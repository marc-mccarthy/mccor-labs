import type { ComponentProps } from 'react'
import { Reveal } from '@/components/motion/Reveal'
import { splitWords } from '@/components/motion/splitWords'
import { cn } from '@/lib/cn'

type SectionHeadingProps = ComponentProps<'h2'> & {
  size?: 'sm' | 'md'
  eyebrow?: { index: string; label: string }
  words?: boolean
}

const SIZE_CLASS = {
  sm: 'text-display-sm',
  md: 'text-display-md',
} as const

function Eyebrow({ index, label }: { index: string; label: string }) {
  return (
    <p className="mb-4 flex items-center gap-3 font-mono text-xs tracking-widest uppercase">
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

export function SectionHeading({
  className,
  children,
  size = 'sm',
  eyebrow,
  words = false,
  ...props
}: SectionHeadingProps) {
  const splitContent = words && typeof children === 'string'
  return (
    <Reveal variant={splitContent ? 'words' : 'mask'}>
      {eyebrow && <Eyebrow index={eyebrow.index} label={eyebrow.label} />}
      <h2
        className={cn(
          SIZE_CLASS[size],
          'leading-tight font-semibold tracking-tight text-text',
          className,
        )}
        {...props}
      >
        {splitContent ? splitWords(children) : children}
      </h2>
    </Reveal>
  )
}
