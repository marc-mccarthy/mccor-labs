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

  it('keeps the default output and applies the md size', () => {
    mockMatchMedia(true)
    const { container, rerender } = render(
      <SectionHeading>Systems we build</SectionHeading>,
    )
    expect(container.firstElementChild?.className).toBe(
      'text-display-sm leading-tight font-semibold tracking-tight text-text',
    )
    rerender(<SectionHeading size="md">Systems we build</SectionHeading>)
    const cls = container.firstElementChild?.className ?? ''
    expect(cls).toContain('text-display-md')
    expect(cls).not.toContain('text-display-sm')
  })

  it('renders the eyebrow outside the h2 and leaves the name intact', () => {
    mockMatchMedia(false)
    const { container } = render(
      <SectionHeading eyebrow={{ index: '01', label: 'Build' }}>
        Systems we build
      </SectionHeading>,
    )
    const heading = screen.getByRole('heading', { level: 2, name: 'Systems we build' })
    expect(heading.textContent).toBe('Systems we build')
    expect(heading.contains(screen.getByText('01'))).toBe(false)
    expect(screen.getByText('Build')).toBeTruthy()
    const tick = screen.getByTestId('eyebrow-tick')
    expect(tick.getAttribute('aria-hidden')).toBe('true')
    expect(tick.className).toContain('w-4')
    expect(tick.className).toContain('motion-on:animate-[band-signal_')
    expect(heading.parentElement?.hasAttribute('data-reveal')).toBe(true)
    expect(container.querySelector('[data-reveal]')).toBe(heading.parentElement)
  })

  it('splits words with the accessible name unchanged', () => {
    mockMatchMedia(false)
    render(<SectionHeading words>Systems we build</SectionHeading>)
    const heading = screen.getByRole('heading', { level: 2, name: 'Systems we build' })
    expect(heading.textContent).toBe('Systems we build')
    expect(heading.querySelectorAll('[data-word]').length).toBe(3)
    expect(heading.parentElement?.hasAttribute('data-reveal')).toBe(true)
  })

  it('does not split when words is off', () => {
    mockMatchMedia(false)
    render(<SectionHeading>Systems we build</SectionHeading>)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.querySelector('[data-word]')).toBeNull()
  })
})
