import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Stagger } from './Stagger'

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

describe('Stagger', () => {
  it('renders every child', () => {
    mockMatchMedia(false)
    render(
      <Stagger>
        <p>first</p>
        <p>second</p>
        <p>third</p>
      </Stagger>,
    )
    expect(screen.getByText('first')).toBeInTheDocument()
    expect(screen.getByText('second')).toBeInTheDocument()
    expect(screen.getByText('third')).toBeInTheDocument()
  })

  it('renders all children visible under reduced motion', () => {
    mockMatchMedia(true)
    render(
      <Stagger>
        <p>first</p>
        <p>second</p>
        <p>third</p>
      </Stagger>,
    )
    for (const text of ['first', 'second', 'third']) {
      const node = screen.getByText(text)
      expect(getComputedStyle(node).opacity).not.toBe('0')
    }
  })
})

describe('Stagger itemClassName', () => {
  it.each([false, true])(
    'passes each index class to the item wrapper (reduced: %s)',
    (reduced) => {
      mockMatchMedia(reduced)
      render(
        <Stagger itemClassName={(index) => `item-${String(index)}`}>
          <p>first</p>
          <p>second</p>
        </Stagger>,
      )
      expect(screen.getByText('first').parentElement).toHaveClass('item-0')
      expect(screen.getByText('second').parentElement).toHaveClass('item-1')
    },
  )
})
