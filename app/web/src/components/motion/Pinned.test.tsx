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
})
