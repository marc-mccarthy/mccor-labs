import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const construct = vi.fn()
const destroy = vi.fn()
const raf = vi.fn()

vi.mock('lenis', () => ({
  default: class MockLenis {
    destroy = destroy
    raf = raf
    constructor(options?: unknown) {
      construct(options)
    }
  },
}))

import { LenisProvider, useLenis } from './LenisProvider'
import { MotionPauseProvider, useMotionPaused } from './MotionPauseProvider'

function PauseButton() {
  const { toggle } = useMotionPaused()
  const lenis = useLenis()
  return (
    <button type="button" data-lenis={String(lenis !== null)} onClick={toggle}>
      pause
    </button>
  )
}

function mockMatchMedia(reduced: boolean) {
  const listeners = new Set<() => void>()
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((_: string, listener: () => void) => listeners.add(listener)),
    removeEventListener: vi.fn((_: string, listener: () => void) =>
      listeners.delete(listener),
    ),
    dispatchEvent: vi.fn(),
  }))
  return listeners
}

describe('LenisProvider', () => {
  beforeEach(() => {
    construct.mockClear()
    destroy.mockClear()
    raf.mockClear()
  })

  it('renders children', () => {
    mockMatchMedia(false)
    render(
      <LenisProvider>
        <p>child content</p>
      </LenisProvider>,
    )
    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('constructs Lenis when motion is allowed', () => {
    mockMatchMedia(false)
    render(<LenisProvider>ok</LenisProvider>)
    expect(construct).toHaveBeenCalledTimes(1)
  })

  it('does not construct Lenis when reduced motion is preferred', () => {
    mockMatchMedia(true)
    render(<LenisProvider>ok</LenisProvider>)
    expect(construct).not.toHaveBeenCalled()
  })

  it('destroys the instance on unmount', () => {
    mockMatchMedia(false)
    const { unmount } = render(<LenisProvider>ok</LenisProvider>)
    unmount()
    expect(destroy).toHaveBeenCalledTimes(1)
  })

  it('cancels the animation frame loop on unmount', () => {
    mockMatchMedia(false)
    const cancel = vi.spyOn(window, 'cancelAnimationFrame')
    const { unmount } = render(<LenisProvider>ok</LenisProvider>)
    unmount()
    expect(cancel).toHaveBeenCalled()
    cancel.mockRestore()
  })

  it('constructs nothing new when reduced motion turns on at runtime', () => {
    const listeners = mockMatchMedia(true)
    render(<LenisProvider>ok</LenisProvider>)
    expect(listeners.size).toBe(1)
    for (const listener of listeners) listener()
    expect(construct).not.toHaveBeenCalled()
  })

  describe('motion pause', () => {
    afterEach(() => {
      localStorage.clear()
      delete document.documentElement.dataset.motion
    })

    it('destroys Lenis for native scroll while paused and recreates it on unpause', () => {
      mockMatchMedia(false)
      render(
        <MotionPauseProvider>
          <LenisProvider>
            <PauseButton />
          </LenisProvider>
        </MotionPauseProvider>,
      )
      const button = screen.getByRole('button', { name: 'pause' })
      expect(construct).toHaveBeenCalledTimes(1)
      expect(button).toHaveAttribute('data-lenis', 'true')

      act(() => {
        button.click()
      })
      expect(destroy).toHaveBeenCalledTimes(1)
      expect(button).toHaveAttribute('data-lenis', 'false')

      act(() => {
        button.click()
      })
      expect(construct).toHaveBeenCalledTimes(2)
      expect(button).toHaveAttribute('data-lenis', 'true')
    })
  })
})
