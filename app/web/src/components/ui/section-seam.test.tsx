import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SectionSeam } from './section-seam'

describe('SectionSeam', () => {
  it('renders a decorative signal-sweep line with no text', () => {
    const { container } = render(<SectionSeam />)
    const seam = container.querySelector('[data-section-seam]')
    expect(seam).not.toBeNull()
    expect(seam?.getAttribute('aria-hidden')).toBe('true')
    expect(seam?.querySelector('[data-signal-sweep]')).not.toBeNull()
    expect(seam?.className).toContain('opacity-40')
    expect(container.textContent).toBe('')
    expect(seam?.querySelector('.bg-brand')).toBeNull()
  })

  it('keeps the node dot outside the swept line so it never scales', () => {
    const { container } = render(<SectionSeam variant="node" />)
    const seam = container.querySelector('[data-section-seam]')
    const dot = seam?.querySelector('.bg-brand')
    expect(dot).not.toBeNull()
    expect(dot?.className).toContain('rounded-full')
    expect(dot?.closest('[data-signal-sweep]')).toBeNull()
    expect(container.textContent).toBe('')
  })
})
