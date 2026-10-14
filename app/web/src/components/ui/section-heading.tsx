import type { ComponentProps } from 'react'
import { Reveal } from '@/components/motion/Reveal'
import { splitWords } from '@/components/motion/splitWords'
import { Eyebrow } from '@/components/ui/eyebrow'
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
