import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('keeps a display size alongside a text color', () => {
    expect(cn('text-display-sm', 'text-text')).toBe('text-display-sm text-text')
  })

  it('lets a later size replace a display size', () => {
    expect(cn('text-display-sm', 'text-sm')).toBe('text-sm')
  })
})
