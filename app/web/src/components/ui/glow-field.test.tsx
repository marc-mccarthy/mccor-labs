import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GlowField } from './glow-field'

const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|rgb\(|rgba\(|hsl\(|oklch\(/

function field(anchor?: 'left' | 'right' | 'center') {
  const { container } = render(<GlowField anchor={anchor} />)
  return container.firstElementChild as HTMLElement
}

describe('GlowField', () => {
  it('renders an empty non-interactive layer behind content', () => {
    const el = field()
    expect(el).toBeEmptyDOMElement()
    expect(el.textContent).toBe('')
    expect(el).toHaveClass('absolute', 'inset-0', '-z-10', 'pointer-events-none')
  })

  it('has no aria-hidden', () => {
    expect(field().hasAttribute('aria-hidden')).toBe(false)
  })

  it('layers the brand and accent glows', () => {
    const image = field().style.backgroundImage
    expect(image).toContain('var(--color-brand)')
    expect(image).toContain('var(--color-accent)')
  })

  it('positions each anchor differently', () => {
    const images = (['left', 'right', 'center'] as const).map((anchor) => {
      const el = field(anchor)
      return el.style.backgroundImage
    })
    expect(new Set(images).size).toBe(3)
  })

  it('defaults to the center anchor', () => {
    expect(field().style.backgroundImage).toBe(field('center').style.backgroundImage)
  })

  it('emits no raw color value', () => {
    const el = field('left')
    expect(el.getAttribute('style') ?? '').not.toMatch(RAW_COLOR)
    expect(el.className).not.toMatch(RAW_COLOR)
  })

  it('merges a custom className', () => {
    const { container } = render(<GlowField className="custom" />)
    expect(container.firstElementChild).toHaveClass('custom', 'absolute')
  })
})
