import type { ComponentProps } from 'react'
import { Reveal } from '@/components/motion/Reveal'
import { cn } from '@/lib/cn'

export function SectionHeading({ className, children, ...props }: ComponentProps<'h2'>) {
  return (
    <Reveal variant="mask">
      <h2
        className={cn(
          'text-display-sm leading-tight font-semibold tracking-tight text-text',
          className,
        )}
        {...props}
      >
        {children}
      </h2>
    </Reveal>
  )
}
