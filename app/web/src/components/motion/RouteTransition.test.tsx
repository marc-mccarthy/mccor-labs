import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

async function freshRouteTransition() {
  vi.resetModules()
  const { RouteTransition } = await import('./RouteTransition')
  return RouteTransition
}

const animate = vi.fn()

beforeEach(() => {
  animate.mockReset()
  HTMLElement.prototype.animate = animate
  const root = document.documentElement.style
  root.setProperty('--duration-route', '0.5s')
  root.setProperty('--ease-route', 'cubic-bezier(0.6, 0, 0.25, 1)')
  root.setProperty('--space-md', '1rem')
})

afterEach(() => {
  document.documentElement.removeAttribute('style')
})

describe('RouteTransition', () => {
  it('does not animate the first page load', async () => {
    mockMatchMedia(false)
    const RouteTransition = await freshRouteTransition()
    render(<RouteTransition>page</RouteTransition>)
    expect(screen.getByText('page')).toBeInTheDocument()
    expect(animate).not.toHaveBeenCalled()
  })

  it('fades and rises each later route in with the route tokens', async () => {
    mockMatchMedia(false)
    const RouteTransition = await freshRouteTransition()
    render(<RouteTransition>first</RouteTransition>).unmount()
    render(<RouteTransition>second</RouteTransition>)
    expect(animate).toHaveBeenCalledTimes(1)
    expect(animate).toHaveBeenCalledWith(
      [
        { opacity: 0, transform: 'translateY(1rem)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 500, easing: 'cubic-bezier(0.6, 0, 0.25, 1)' },
    )
  })

  it('never animates a route under reduced motion', async () => {
    mockMatchMedia(true)
    const RouteTransition = await freshRouteTransition()
    render(<RouteTransition>first</RouteTransition>).unmount()
    render(<RouteTransition>second</RouteTransition>)
    expect(screen.getByText('second')).toBeInTheDocument()
    expect(animate).not.toHaveBeenCalled()
  })
})
