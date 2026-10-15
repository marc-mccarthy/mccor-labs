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
  it('renders a visible, unclipped h2 inside a plain wrapper div under reduced motion', () => {
    mockMatchMedia(true)
    const { container } = render(<SectionHeading>Systems we build</SectionHeading>)
    const heading = screen.getByRole('heading', { level: 2, name: 'Systems we build' })
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.tagName).toBe('DIV')
    expect(wrapper.firstElementChild).toBe(heading)
    expect(wrapper.style.clipPath).toBe('')
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

  it('sets the h2 on the display-sm scale inside a ruled row with a 2px brand segment', () => {
    mockMatchMedia(true)
    const { container } = render(<SectionHeading>Systems we build</SectionHeading>)
    const row = container.firstElementChild as HTMLElement
    expect(row.tagName).toBe('DIV')
    expect(screen.getByRole('heading', { level: 2 }).className).toBe(
      'text-display-sm leading-tight font-semibold tracking-tight text-balance text-text',
    )
    expect(row).toHaveClass(
      'relative',
      'flex',
      'flex-col',
      'items-start',
      'gap-y-1',
      'sm:flex-row',
      'sm:items-baseline',
      'sm:justify-start',
      'sm:gap-x-6',
      'border-b',
      'border-border',
      'pb-4',
      'after:absolute',
      'after:-bottom-px',
      'after:left-0',
      'after:h-0.5',
      'after:w-12',
      'after:bg-brand',
    )
    expect(row).not.toHaveClass('justify-between', 'sm:justify-between')
  })

  it('drops the rule and brand segment when rule is off', () => {
    mockMatchMedia(true)
    const { container } = render(
      <SectionHeading rule={false}>Systems we build</SectionHeading>,
    )
    const row = container.firstElementChild as HTMLElement
    expect(row).toHaveClass('flex', 'sm:flex-row')
    expect(row.className).not.toMatch(/border-b|after:|pb-4/)
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
    expect(screen.queryByTestId('eyebrow-tick')).toBeNull()
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

  it('renders the index and label as a tag right after the h2 in the heading row', () => {
    mockMatchMedia(false)
    render(
      <SectionHeading eyebrow={{ index: '01', label: 'Build' }}>
        Systems we build
      </SectionHeading>,
    )
    const heading = screen.getByRole('heading', { level: 2, name: 'Systems we build' })
    const tag = screen.getByText('01').parentElement!
    expect(tag.tagName).toBe('P')
    expect(tag.className).toBe(
      'shrink-0 font-mono text-xs tracking-widest text-muted uppercase tabular-nums',
    )
    expect(tag.parentElement).toBe(heading.parentElement)
    expect(heading.nextElementSibling).toBe(tag)
    expect(tag.textContent).toBe('01 / Build')
    expect(screen.getByText('/')).toHaveAttribute('aria-hidden', 'true')
  })
})
