import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SectionHeading } from './section-heading'

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('SectionHeading', () => {
  it('renders a visible, unclipped h2 with no wrapper under reduced motion', () => {
    mockMatchMedia(true)
    const { container } = render(<SectionHeading>Systems we build</SectionHeading>)
    const heading = screen.getByRole('heading', { level: 2, name: 'Systems we build' })
    expect(container.firstElementChild).toBe(heading)
    expect(container.querySelector('[data-reveal]')).toBeNull()
    expect(getComputedStyle(heading).clipPath).toBe('')
    expect(getComputedStyle(heading).opacity).not.toBe('0')
  })

  it('wipes in from a bottom inset below the fold with its accessible name intact', async () => {
    mockMatchMedia(false)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: window.innerHeight + 100,
      bottom: window.innerHeight + 200,
    } as DOMRect)
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      },
    )
    const { container } = render(<SectionHeading>Systems we build</SectionHeading>)
    const wrapper = await waitFor(() => {
      const animated = container.querySelector<HTMLElement>('[data-reveal=""]')
      expect(animated).not.toBeNull()
      return animated
    })
    expect(wrapper?.style.clipPath).toBe('inset(0% 0% 100% 0%)')
    expect(wrapper?.style.opacity).toBe('')
    expect(screen.getByRole('heading', { level: 2, name: 'Systems we build' })).toBe(
      wrapper?.firstElementChild,
    )
  })
})
