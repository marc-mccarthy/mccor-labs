import { describe, expect, it } from 'vitest'

import { fieldVariants } from './field'

describe('fieldVariants', () => {
  it('defaults to the input kind', () => {
    expect(fieldVariants()).toBe(fieldVariants({ kind: 'input' }))
  })

  it('gives input and select a fixed h-11 height', () => {
    expect(fieldVariants({ kind: 'input' })).toContain('h-11')
    expect(fieldVariants({ kind: 'select' })).toContain('h-11')
  })

  it('gives textarea the content-sized classes and no fixed height', () => {
    const out = fieldVariants({ kind: 'textarea' })
    expect(out).toContain('py-2')
    expect(out).toContain('min-h-[calc(6lh+1rem)]')
    expect(out).toContain('max-h-[60vh]')
    expect(out).toContain('field-sizing-content')
    expect(out.split(' ')).not.toContain('h-11')
  })

  it('gives select appearance-none, right padding and a pointer cursor', () => {
    const out = fieldVariants({ kind: 'select' })
    expect(out).toContain('appearance-none')
    expect(out).toContain('pr-10')
    expect(out).toContain('cursor-pointer')
  })

  it('keeps select-only classes off input and textarea', () => {
    expect(fieldVariants({ kind: 'input' })).not.toContain('appearance-none')
    expect(fieldVariants({ kind: 'textarea' })).not.toContain('cursor-pointer')
  })

  it.each(['input', 'select', 'textarea'] as const)(
    '%s carries the shared state classes',
    (kind) => {
      const out = fieldVariants({ kind })
      expect(out).toContain('border-border-strong')
      expect(out).toContain('hover:border-muted')
      expect(out).toContain('focus-visible:border-accent')
      expect(out).toContain('aria-[invalid=true]:border-brand')
      expect(out).toContain('aria-[invalid=true]:focus-visible:outline-brand')
      expect(out).toContain('aria-[invalid=true]:focus-visible:animate-none')
      expect(out).toContain('var(--color-accent)')
      expect(out).toContain('var(--color-brand)')
    },
  )

  it.each(['input', 'select', 'textarea'] as const)(
    '%s contains no colour literal',
    (kind) => {
      expect(fieldVariants({ kind })).not.toMatch(/#|rgb\(|hsl\(|oklch\(/)
    },
  )
})
