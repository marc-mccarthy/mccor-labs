import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Section } from './Section'

describe('Section', () => {
  it('applies the default section rhythm padding', () => {
    const { container } = render(<Section>x</Section>)
    expect(container.firstElementChild?.className).toBe('py-14 sm:py-20')
  })

  it('maps compact and spacious sizes', () => {
    const compact = render(<Section size="compact">x</Section>)
    expect(compact.container.firstElementChild?.className).toBe('py-12 sm:py-16')
    const spacious = render(<Section size="spacious">x</Section>)
    expect(spacious.container.firstElementChild?.className).toBe('py-24 sm:py-32')
  })

  it('lets caller padding win', () => {
    const { container } = render(
      <Section size="spacious" className="py-0">
        x
      </Section>,
    )
    const classes = container.firstElementChild?.className.split(' ') ?? []
    expect(classes).toContain('py-0')
    expect(classes).not.toContain('py-24')
  })
})
