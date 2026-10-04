import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const on = vi.fn(() => () => undefined)
const destroy = vi.fn()
const raf = vi.fn()

vi.mock('lenis', () => ({
  default: class MockLenis {
    on = on
    destroy = destroy
    raf = raf
  },
}))

import { LenisProvider } from './LenisProvider'
import { useScrollProgress } from './useScrollProgress'

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

function mockRect(top: number, height: number): DOMRect {
  return {
    top,
    height,
    bottom: top + height,
    left: 0,
    right: 0,
    width: 0,
    x: 0,
    y: top,
    toJSON() {
      return {}
    },
  }
}

function elementRef(rect: DOMRect) {
  const element = document.createElement('div')
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect)
  return { current: element }
}

describe('useScrollProgress', () => {
  it('returns 0 before the element enters the viewport', () => {
    mockMatchMedia(false)
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const ref = elementRef(mockRect(2000, 400))
    const { result } = renderHook(() => useScrollProgress(ref))
    expect(result.current).toBe(0)
  })

  it('approaches 1 as the element leaves the viewport', () => {
    mockMatchMedia(false)
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const ref = elementRef(mockRect(-400, 400))
    const { result } = renderHook(() => useScrollProgress(ref))
    expect(result.current).toBeCloseTo(1, 5)
  })

  it('subscribes to the Lenis scroll event when a real provider supplies an instance', () => {
    mockMatchMedia(false)
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const ref = elementRef(mockRect(0, 400))
    renderHook(() => useScrollProgress(ref), { wrapper: LenisProvider })
    expect(on).toHaveBeenCalledWith('scroll', expect.any(Function))
  })

  it('falls back to a native scroll listener when there is no Lenis provider', () => {
    mockMatchMedia(false)
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const ref = elementRef(mockRect(0, 400))
    renderHook(() => useScrollProgress(ref))
    expect(addEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      expect.objectContaining({ passive: true }),
    )
    addEventListener.mockRestore()
  })

  it('recomputes once per frame when the viewport resizes', () => {
    mockMatchMedia(false)
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      frames.push(callback),
    )
    const ref = elementRef(mockRect(400, 400))
    const { result } = renderHook(() => useScrollProgress(ref))
    expect(result.current).toBeCloseTo(1 / 3, 5)

    Object.defineProperty(window, 'innerHeight', { value: 1600, configurable: true })
    act(() => {
      window.dispatchEvent(new Event('resize'))
      window.dispatchEvent(new Event('resize'))
    })
    expect(frames).toHaveLength(1)
    act(() => {
      frames[0]?.(0)
    })
    expect(result.current).toBeCloseTo(0.6, 5)
    vi.unstubAllGlobals()
  })

  it('returns a stable value under reduced motion', () => {
    mockMatchMedia(true)
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const ref = elementRef(mockRect(0, 400))
    const { result } = renderHook(() => useScrollProgress(ref))
    expect(result.current).toBe(0)
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(result.current).toBe(0)
  })
})
