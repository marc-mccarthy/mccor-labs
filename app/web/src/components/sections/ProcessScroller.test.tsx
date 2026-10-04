import { render, screen } from '@testing-library/react'
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

  it('pins the track with sticky positioning when motion is allowed', () => {
    mockMatchMedia(false)
    render(<ProcessScroller />)
    const heading = screen.getByRole('heading', { name: process[0]!.title })
    expect(hasStickyAncestor(heading)).toBe(true)
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
})
