import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export function Section({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn('py-16 sm:py-24', className)} {...props} />
}
