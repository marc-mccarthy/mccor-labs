import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { HeroMotionCanvas } from './HeroMotionCanvas'
import { MOTION_STORAGE_KEY, MotionPauseProvider } from './MotionPauseProvider'

describe('HeroMotionCanvas', () => {
  beforeEach(() => {
    const mockCtx = {
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      scale: vi.fn(),
      resetTransform: vi.fn(),
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      mockCtx as unknown as CanvasRenderingContext2D,
    )

    class MockIntersectionObserver {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
      constructor(callback: IntersectionObserverCallback) {
        callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        )
      }
    }
    global.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver

    class MockResizeObserver {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    }
    global.ResizeObserver = MockResizeObserver

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  it('renders canvas element with accessible label', () => {
    render(<HeroMotionCanvas />)
    const canvas = screen.getByRole('img', {
      name: /interactive cybernetic constellation/i,
    })
    expect(canvas).toBeInTheDocument()
    expect(canvas.tagName.toLowerCase()).toBe('canvas')
  })

  afterEach(() => {
    window.localStorage.removeItem(MOTION_STORAGE_KEY)
    delete document.documentElement.dataset.motion
    vi.unstubAllGlobals()
  })

  it('draws one still frame and starts no loop when motion is paused', () => {
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'paused')
    document.documentElement.dataset.motion = 'paused'
    const frame = vi.fn(() => 1)
    vi.stubGlobal('requestAnimationFrame', frame)
    render(
      <MotionPauseProvider>
        <HeroMotionCanvas />
      </MotionPauseProvider>,
    )
    expect(frame).not.toHaveBeenCalled()
  })

  it('starts its loop when motion is not paused', () => {
    const frame = vi.fn(() => 1)
    vi.stubGlobal('requestAnimationFrame', frame)
    render(
      <MotionPauseProvider>
        <HeroMotionCanvas />
      </MotionPauseProvider>,
    )
    expect(frame).toHaveBeenCalled()
  })

  it('cleans up without throwing on unmount', () => {
    const { unmount } = render(<HeroMotionCanvas />)
    expect(() => {
      unmount()
    }).not.toThrow()
  })
})
