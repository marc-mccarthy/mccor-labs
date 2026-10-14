import { cva } from 'class-variance-authority'

const fieldVariants = cva(
  'w-full rounded-lg border border-border-strong bg-base/60 text-text placeholder:text-muted px-3 text-base scroll-mt-24 motion-on:transition-[border-color,box-shadow] motion-on:duration-(--duration-pointer) motion-on:ease-(--ease-pointer) hover:border-muted focus-visible:border-accent focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_24%,transparent)] aria-[invalid=true]:border-brand aria-[invalid=true]:focus-visible:outline-brand aria-[invalid=true]:focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-brand)_24%,transparent)] aria-[invalid=true]:focus-visible:animate-none',
  {
    variants: {
      kind: {
        input: 'h-11',
        select: 'h-11 appearance-none pr-10 cursor-pointer',
        textarea: 'py-2 min-h-[calc(6lh+1rem)] max-h-[60vh] field-sizing-content',
      },
    },
    defaultVariants: { kind: 'input' },
  },
)

export { fieldVariants }
