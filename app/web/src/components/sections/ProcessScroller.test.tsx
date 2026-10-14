import { act, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ProcessScroller } from './ProcessScroller'
import { process } from '@/content/process'

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

function hasStickyAncestor(node: HTMLElement): boolean {
  for (let el: HTMLElement | null = node; el; el = el.parentElement) {
    if (getComputedStyle(el).position === 'sticky') return true
  }
  return false
}

describe('ProcessScroller', () => {
  it('renders every stage title and duration', () => {
    mockMatchMedia(false)
    render(<ProcessScroller />)
    for (const stage of process) {
      expect(screen.getByRole('heading', { name: stage.title })).toBeInTheDocument()
      expect(screen.getByText(new RegExp(stage.duration))).toBeInTheDocument()
    }
  })

  it.each([false, true])('renders the optional h2 (reduced: %s)', (reduced) => {
    mockMatchMedia(reduced)
    render(<ProcessScroller heading="How it runs" />)
    expect(
      screen.getByRole('heading', { level: 2, name: 'How it runs' }),
    ).toBeInTheDocument()
  })

  it('pins the track from md up and stacks it below md when motion is allowed', () => {
    mockMatchMedia(false)
    render(<ProcessScroller />)
    const heading = screen.getByRole('heading', { name: process[0]!.title })
    expect(hasStickyAncestor(heading)).toBe(false)
    expect(heading.closest('.motion-safe\\:md\\:sticky')).not.toBeNull()
    expect(heading.closest('ol')).toHaveClass('flex-col', 'motion-safe:md:flex-row')
  })

  it('renders stacked with no sticky positioning under reduced motion', () => {
    mockMatchMedia(true)
    render(<ProcessScroller />)
    for (const stage of process) {
      const heading = screen.getByRole('heading', { name: stage.title })
      expect(hasStickyAncestor(heading)).toBe(false)
      expect(screen.getByText(new RegExp(stage.duration))).toBeInTheDocument()
    }
  })

  it.each([false, true])('sets aria-hidden on no stage (reduced: %s)', (reduced) => {
    mockMatchMedia(reduced)
    const { container } = render(<ProcessScroller />)
    expect(container.querySelectorAll('[aria-hidden]')).toHaveLength(0)
    expect(container.querySelectorAll('[inert], [hidden]')).toHaveLength(0)
  })

  it('renders exactly one section', () => {
    mockMatchMedia(false)
    const { container } = render(<ProcessScroller />)
    expect(container.querySelectorAll('section')).toHaveLength(1)
  })

  it('server-renders the track at rest', () => {
    mockMatchMedia(false)
    const html = renderToString(<ProcessScroller />)
    expect(html).toContain('--shift-md:0%;--shift-lg:0%')
  })

  it('writes the track shift on mount and on scroll', () => {
    mockMatchMedia(false)
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true })
    let top = 0
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(
        () =>
          ({
            top,
            height: 2000,
            bottom: top + 2000,
            left: 0,
            right: 0,
            width: 0,
            x: 0,
            y: top,
          }) as DOMRect,
      )
    render(<ProcessScroller />)
    const track = screen.getByRole('heading', { name: process[0]!.title }).closest('ol')!
    expect(track.style.getPropertyValue('--shift-md')).toBe('0%')
    expect(track.style.getPropertyValue('--shift-lg')).toBe('0%')

    top = -500
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    const fraction = 0.5
    const shift = (name: string) => track.style.getPropertyValue(name)
    expect(shift('--shift-md')).toMatch(/%$/)
    expect(parseFloat(shift('--shift-md'))).toBeCloseTo(
      fraction * (process.length - 1) * 100,
      5,
    )
    expect(parseFloat(shift('--shift-lg'))).toBeCloseTo(
      fraction * (process.length - 2) * 50,
      5,
    )
    rect.mockRestore()
  })
})
