import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Magnetic } from './Magnetic'

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

function renderAt() {
  render(
    <Magnetic>
      <a href="#book">Book</a>
    </Magnetic>,
  )
  const wrapper = screen.getByRole('link').parentElement!
  wrapper.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 100, height: 40 }) as DOMRect
  return wrapper
}

describe('Magnetic', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('pulls toward the pointer by a few clamped pixels and springs back on leave', () => {
    mockMatchMedia({ fine: true, reduced: false })
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })
    const wrapper = renderAt()
    fireEvent.pointerMove(wrapper, { clientX: 100, clientY: 25 })
    expect(wrapper.style.transform).toBe('translate3d(6px, 1px, 0)')
    fireEvent.pointerLeave(wrapper)
    expect(wrapper.style.transform).toBe('')
  })

  it.each([
    ['a coarse pointer', { fine: false, reduced: false }],
    ['reduced motion', { fine: true, reduced: true }],
  ])('never moves under %s', (_label, media) => {
    mockMatchMedia(media)
    const wrapper = renderAt()
    fireEvent.pointerMove(wrapper, { clientX: 100, clientY: 25 })
    expect(wrapper.style.transform).toBe('')
  })
})
