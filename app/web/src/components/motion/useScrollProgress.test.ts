import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
import { useScrollProgress, useScrollProgressValue } from './useScrollProgress'

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

function movableRef(rect: DOMRect) {
  const element = document.createElement('div')
  let current = rect
  vi.spyOn(element, 'getBoundingClientRect').mockImplementation(() => current)
  return {
    ref: { current: element },
    move: (next: DOMRect) => {
      current = next
    },
  }
}

function stubIntersectionObserver() {
  const callbacks: IntersectionObserverCallback[] = []
  const options: (IntersectionObserverInit | undefined)[] = []
  const construct = vi.fn()
  class MockIntersectionObserver {
    observe = vi.fn()
    disconnect = vi.fn()
    constructor(callback: IntersectionObserverCallback, init?: IntersectionObserverInit) {
      construct()
      callbacks.push(callback)
      options.push(init)
    }
  }
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  return {
    construct,
    options,
    report(isIntersecting: boolean) {
      act(() => {
        for (const callback of callbacks) {
          callback(
            [{ isIntersecting } as IntersectionObserverEntry],
            {} as IntersectionObserver,
          )
        }
      })
    },
  }
}

function scroll() {
  act(() => {
    window.dispatchEvent(new Event('scroll'))
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

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

  it('ignores scroll and never re-renders while the element is far from the viewport', () => {
    mockMatchMedia(false)
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const observer = stubIntersectionObserver()
    const { ref, move } = movableRef(mockRect(2000, 400))
    let renders = 0
    const { result } = renderHook(() => {
      renders += 1
      return useScrollProgress(ref)
    })
    expect(observer.options).toEqual([{ rootMargin: '50% 0px' }])
    observer.report(false)
    const settled = renders

    move(mockRect(0, 400))
    scroll()

    expect(renders).toBe(settled)
    expect(result.current).toBe(0)
  })

  it('tracks scroll while near the viewport and clamps to 1 once it leaves upward', () => {
    mockMatchMedia(false)
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const observer = stubIntersectionObserver()
    const { ref, move } = movableRef(mockRect(400, 400))
    const { result } = renderHook(() => useScrollProgress(ref))
    observer.report(true)
    expect(result.current).toBeCloseTo(1 / 3, 5)

    move(mockRect(0, 400))
    scroll()
    expect(result.current).toBeCloseTo(2 / 3, 5)

    move(mockRect(-900, 400))
    observer.report(false)
    expect(result.current).toBe(1)

    move(mockRect(0, 400))
    scroll()
    expect(result.current).toBe(1)
  })

  it('clamps to 0 once the element leaves below the viewport', () => {
    mockMatchMedia(false)
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const observer = stubIntersectionObserver()
    const { ref, move } = movableRef(mockRect(400, 400))
    const { result } = renderHook(() => useScrollProgress(ref))
    observer.report(true)
    expect(result.current).toBeCloseTo(1 / 3, 5)

    move(mockRect(1300, 400))
    observer.report(false)
    expect(result.current).toBe(0)
  })
})

describe('useScrollProgressValue', () => {
  it('updates the MotionValue on scroll without re-rendering', () => {
    mockMatchMedia(false)
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const { ref, move } = movableRef(mockRect(400, 400))
    let renders = 0
    const { result } = renderHook(() => {
      renders += 1
      return useScrollProgressValue(ref)
    })
    expect(result.current.get()).toBeCloseTo(1 / 3, 5)
    const settled = renders

    move(mockRect(0, 400))
    scroll()

    expect(result.current.get()).toBeCloseTo(2 / 3, 5)
    expect(renders).toBe(settled)
  })

  it('stays at 0 with no observer or scroll listener under reduced motion', () => {
    mockMatchMedia(true)
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    const observer = stubIntersectionObserver()
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const { ref } = movableRef(mockRect(0, 400))
    const { result } = renderHook(() => useScrollProgressValue(ref))
    scroll()
    expect(result.current.get()).toBe(0)
    expect(observer.construct).not.toHaveBeenCalled()
    expect(addEventListener).not.toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      expect.anything(),
    )
    addEventListener.mockRestore()
  })
})
