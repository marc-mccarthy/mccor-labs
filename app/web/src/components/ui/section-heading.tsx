import type { ComponentProps } from 'react'
import { Reveal } from '@/components/motion/Reveal'
import { splitWords } from '@/components/motion/splitWords'
import { cn } from '@/lib/cn'

type SectionHeadingProps = ComponentProps<'h2'> & {
  eyebrow?: { index: string; label: string }
  words?: boolean
  rule?: boolean
}

const ROW_CLASS =
  'relative flex flex-col items-start gap-y-1 sm:flex-row sm:items-baseline sm:justify-start sm:gap-x-6'

const RULE_CLASS =
  'border-b border-border pb-4 after:absolute after:-bottom-px after:left-0 after:h-0.5 after:w-12 after:bg-brand'

export function SectionHeading({
  className,
  children,
  eyebrow,
  words = false,
  rule = true,
  ...props
}: SectionHeadingProps) {
  const splitContent = words && typeof children === 'string'
  return (
    <Reveal
      variant={splitContent ? 'words' : 'mask'}
      className={cn(ROW_CLASS, rule && RULE_CLASS)}
    >
      <h2
        className={cn(
          'text-display-sm leading-tight font-semibold tracking-tight text-balance text-text',
          className,
        )}
        {...props}
      >
        {splitContent ? splitWords(children) : children}
      </h2>
      {eyebrow && (
        <p className="shrink-0 font-mono text-xs tracking-widest text-muted uppercase tabular-nums">
          <span>{eyebrow.index}</span> <span aria-hidden="true">/</span>{' '}
          <span>{eyebrow.label}</span>
        </p>
      )}
    </Reveal>
  )
}
