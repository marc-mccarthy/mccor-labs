import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

const SIZE_CLASS = {
  compact: 'py-12 sm:py-16',
  default: 'py-16 sm:py-24',
  spacious: 'py-24 sm:py-32',
} as const

type SectionProps = ComponentProps<'section'> & {
  size?: keyof typeof SIZE_CLASS
}

export function Section({ className, size = 'default', ...props }: SectionProps) {
  return <section className={cn(SIZE_CLASS[size], className)} {...props} />
}
