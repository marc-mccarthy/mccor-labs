import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Dark label on the accent fill: 5.31:1.
        primary: 'bg-accent text-base hover:bg-brand',
        secondary: 'bg-surface text-text border border-border-strong hover:bg-elevated',
        ghost: 'text-text hover:bg-surface',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-4',
        md: 'h-11 px-6',
        // text-base resolves to the --color-base colour utility here, not a font
        // size, so lg uses an arbitrary value to get the intended size bump.
        lg: 'h-13 px-8 text-[1rem]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

interface ButtonProps
  extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  return (
    <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
}

export { buttonVariants }
