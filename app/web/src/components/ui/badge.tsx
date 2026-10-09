import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-3 py-1 font-mono text-xs tracking-wider uppercase',
  {
    variants: {
      variant: {
        default: 'border border-border bg-surface text-muted',
        'plain-code':
          'gap-2 bg-transparent normal-case tracking-normal text-sm text-text',
        rules: 'gap-2 bg-transparent normal-case tracking-normal text-sm text-text',
        'classic-ml':
          'gap-2 bg-transparent normal-case tracking-normal text-sm text-accent',
        'language-model':
          'gap-2 bg-transparent normal-case tracking-normal text-sm text-accent',
        'do-not-automate':
          'gap-2 bg-transparent normal-case tracking-normal text-sm text-text',
        unclear: 'gap-2 bg-transparent normal-case tracking-normal text-sm text-muted',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

interface BadgeProps extends ComponentProps<'span'>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { badgeVariants }
