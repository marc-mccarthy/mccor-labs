## Task 8: shadcn/ui Button primitive

**Files:**
- Create: `app/web/components.json`, `app/web/src/components/ui/button.tsx`, `app/web/src/components/ui/button.test.tsx`
- Modify: `app/web/package.json`

**Interfaces:**
- Consumes: Tasks 2 and 6.
- Produces: `<Button variant asChild>`; `buttonVariants()` for link styling.

- [ ] **Step 1: Install the primitives shadcn's Button needs**

Run: `pnpm -F web add class-variance-authority @radix-ui/react-slot`

- [ ] **Step 2: Create the shadcn config**

Created by hand rather than via `shadcn init`, because the CLI would rewrite `globals.css` and replace the measured tokens from Task 6.

Create `app/web/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/cn",
    "ui": "@/components/ui"
  }
}
```

- [ ] **Step 3: Write the failing Button test**

Create `app/web/src/components/ui/button.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Book a call</Button>)
    expect(screen.getByRole('button', { name: 'Book a call' })).toBeInTheDocument()
  })

  it('renders as a link when asChild is set, so CTAs can navigate', () => {
    render(
      <Button asChild>
        <a href="/contact/">Contact</a>
      </Button>,
    )
    const link = screen.getByRole('link', { name: 'Contact' })
    expect(link).toHaveAttribute('href', '/contact/')
  })

  it('exposes the disabled state to assistive technology', () => {
    render(<Button disabled>Sending</Button>)
    expect(screen.getByRole('button', { name: 'Sending' })).toBeDisabled()
  })
})
```

- [ ] **Step 4: Run it to verify it fails**

Run: `pnpm -F web exec vitest run src/components/ui`
Expected: FAIL — cannot resolve `./button`.

- [ ] **Step 5: Create the Button**

Colours reference tokens only, so the ESLint colour rule stays satisfied.

Create `app/web/src/components/ui/button.tsx`:

```tsx
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
        lg: 'h-13 px-8 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { buttonVariants }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm -F web exec vitest run src/components/ui`
Expected: PASS — all three cases.

- [ ] **Step 7: Commit**

```bash
git add app/web/components.json app/web/src/components/ui app/web/package.json pnpm-lock.yaml
git commit -m "feat(web): Button primitive built on owned shadcn source"
```

---

