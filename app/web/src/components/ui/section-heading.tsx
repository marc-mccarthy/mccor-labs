import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export function SectionHeading({ className, children, ...props }: ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('text-3xl font-semibold tracking-tight text-text', className)}
      {...props}
    >
      {children}
    </h2>
  )
}
