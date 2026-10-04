import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Spotlight } from './Spotlight'

function mockMatchMedia({ fine, reduced }: { fine: boolean; reduced: boolean }) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches:
      (fine && query === '(hover: hover) and (pointer: fine)') ||
      (reduced && query === '(prefers-reduced-motion: reduce)'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

function renderCard() {
  const { container } = render(
    <div data-card="">
      <Spotlight />
      <p>content</p>
    </div>,
  )
  const card = container.querySelector<HTMLElement>('[data-card]')!
  card.getBoundingClientRect = () => ({ left: 10, top: 20 }) as DOMRect
  return card
}

describe('Spotlight', () => {
  it('tracks the pointer inside the card as CSS variables on a decorative layer', () => {
    mockMatchMedia({ fine: true, reduced: false })
    const card = renderCard()
    fireEvent.pointerMove(card.querySelector('p')!, { clientX: 50, clientY: 70 })
    const glow = card.querySelector<HTMLElement>('[data-spotlight]')!
    expect(glow).toHaveAttribute('aria-hidden', 'true')
    expect(glow.style.getPropertyValue('--spot-x')).toBe('40px')
    expect(glow.style.getPropertyValue('--spot-y')).toBe('50px')
  })

  it.each([
    ['a coarse pointer', { fine: false, reduced: false }],
    ['reduced motion', { fine: true, reduced: true }],
  ])('renders nothing under %s', (_label, media) => {
    mockMatchMedia(media)
    const card = renderCard()
    expect(card.querySelector('[data-spotlight]')).toBeNull()
  })
})
