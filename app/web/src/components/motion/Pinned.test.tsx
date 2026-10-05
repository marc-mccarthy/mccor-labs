import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Pinned } from './Pinned'

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

describe('Pinned', () => {
  it('renders its children', () => {
    mockMatchMedia(false)
    render(
      <Pinned height="200vh">
        <p>content</p>
      </Pinned>,
    )
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('renders as normal flow content under reduced motion', () => {
    mockMatchMedia(true)
    render(
      <Pinned height="200vh">
        <p>content</p>
      </Pinned>,
    )
    const node = screen.getByText('content')
    expect(getComputedStyle(node.parentElement!).position).not.toBe('sticky')
    expect(getComputedStyle(node.parentElement!).height).not.toBe('200vh')
  })

  it('does not set aria-hidden on its children', () => {
    mockMatchMedia(false)
    render(
      <Pinned height="200vh">
        <p>content</p>
      </Pinned>,
    )
    expect(screen.getByText('content')).not.toHaveAttribute('aria-hidden')
  })
  it('pins only from md up when asked, with the height carried as a variable', () => {
    mockMatchMedia(false)
    render(
      <Pinned height="200vh" from="md">
        <p>content</p>
      </Pinned>,
    )
    const inner = screen.getByText('content').parentElement!
    expect(getComputedStyle(inner).position).not.toBe('sticky')
    expect(inner).toHaveClass('motion-safe:md:sticky', 'motion-safe:md:top-0')
    expect(inner.parentElement).toHaveClass('motion-safe:md:h-(--pin-height)')
    expect(inner.parentElement!.style.getPropertyValue('--pin-height')).toBe('200vh')
  })

  it('pins only when the visitor allows motion, so server markup never collapses on hydration', () => {
    mockMatchMedia(false)
    render(
      <Pinned height="150vh">
        <p>content</p>
      </Pinned>,
    )
    const inner = screen.getByText('content').parentElement!
    expect(inner).toHaveClass('motion-safe:sticky', 'motion-safe:top-0')
    expect(inner.parentElement).toHaveClass('motion-safe:h-(--pin-height)')
    expect(inner.parentElement!.style.height).toBe('')
  })
})
