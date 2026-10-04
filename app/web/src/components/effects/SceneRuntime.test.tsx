import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const rendererCtor = vi.fn()
const rendererDispose = vi.fn()
const rendererForceContextLoss = vi.fn()
const rendererSetPixelRatio = vi.fn()

vi.mock('three', () => ({
  WebGLRenderer: class {
    dispose = rendererDispose
    forceContextLoss = rendererForceContextLoss
    setPixelRatio = rendererSetPixelRatio
    constructor() {
      rendererCtor()
    }
  },
}))

import { SceneRuntime, resetWebGL2Probe, type SceneHandle } from './SceneRuntime'

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

function mockWebGL2(available: boolean) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((id: string) =>
    id === 'webgl2' && available ? { getExtension: vi.fn(() => null) } : null) as never)
}

describe('SceneRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetWebGL2Probe()
  })

  it('renders the fallback and never constructs a renderer under reduced motion', () => {
    mockMatchMedia(true)
    mockWebGL2(true)
    const build = vi.fn()

    render(<SceneRuntime fallback={<div data-testid="fallback" />} build={build} />)

    expect(screen.getByTestId('fallback')).toBeInTheDocument()
    expect(document.querySelector('[data-scene-status]')).toHaveAttribute(
      'data-scene-status',
      'fallback',
    )
    expect(build).not.toHaveBeenCalled()
    expect(rendererCtor).not.toHaveBeenCalled()
  })

  it('renders the fallback when WebGL2 is unavailable', () => {
    mockMatchMedia(false)
    mockWebGL2(false)
    const build = vi.fn()

    render(<SceneRuntime fallback={<div data-testid="fallback" />} build={build} />)

    expect(screen.getByTestId('fallback')).toBeInTheDocument()
    expect(document.querySelector('[data-scene-status]')).toHaveAttribute(
      'data-scene-status',
      'fallback',
    )
    expect(build).not.toHaveBeenCalled()
    expect(rendererCtor).not.toHaveBeenCalled()
  })

  it('goes active and calls build once WebGL2 is available', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    const sceneRender = vi.fn()
    const sceneDispose = vi.fn()
    const build = vi.fn((): SceneHandle => ({
      render: sceneRender,
      dispose: sceneDispose,
    }))

    render(<SceneRuntime fallback={<div data-testid="fallback" />} build={build} />)

    await waitFor(() => {
      expect(document.querySelector('[data-scene-status]')).toHaveAttribute(
        'data-scene-status',
        'active',
      )
    })

    expect(build).toHaveBeenCalledTimes(1)
    expect(rendererCtor).toHaveBeenCalledTimes(1)
    expect(rendererSetPixelRatio).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('fallback')).not.toBeInTheDocument()
  })

  it('disposes the scene and the renderer on unmount', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    const sceneRender = vi.fn()
    const sceneDispose = vi.fn()
    const build = vi.fn((): SceneHandle => ({
      render: sceneRender,
      dispose: sceneDispose,
    }))

    const { container, unmount } = render(
      <SceneRuntime fallback={<div data-testid="fallback" />} build={build} />,
    )

    await waitFor(() => {
      expect(container.querySelector('[data-scene-status]')).toHaveAttribute(
        'data-scene-status',
        'active',
      )
    })

    unmount()

    expect(sceneDispose).toHaveBeenCalledTimes(1)
    expect(rendererForceContextLoss).toHaveBeenCalledTimes(1)
    expect(rendererDispose).toHaveBeenCalledTimes(1)
  })

  it('falls back and disposes the scene when the WebGL context is lost', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    const sceneRender = vi.fn()
    const sceneDispose = vi.fn()
    const build = vi.fn((): SceneHandle => ({
      render: sceneRender,
      dispose: sceneDispose,
    }))

    const { container } = render(
      <SceneRuntime fallback={<div data-testid="fallback" />} build={build} />,
    )

    await waitFor(() => {
      expect(container.querySelector('[data-scene-status]')).toHaveAttribute(
        'data-scene-status',
        'active',
      )
    })

    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
    const event = new Event('webglcontextlost', { cancelable: true })
    canvas?.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(sceneDispose).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(container.querySelector('[data-scene-status]')).toHaveAttribute(
        'data-scene-status',
        'fallback',
      )
    })
  })

  it('falls back and releases the renderer when the scene build throws', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    const build = vi.fn((): SceneHandle => {
      throw new Error('build failed')
    })

    const { container, unmount } = render(
      <SceneRuntime fallback={<div data-testid="fallback" />} build={build} />,
    )

    await waitFor(() => {
      expect(container.querySelector('[data-scene-status]')).toHaveAttribute(
        'data-scene-status',
        'fallback',
      )
    })
    expect(rendererCtor).toHaveBeenCalledTimes(1)
    expect(rendererForceContextLoss).toHaveBeenCalledTimes(1)
    expect(rendererDispose).toHaveBeenCalledTimes(1)

    unmount()
    expect(rendererDispose).toHaveBeenCalledTimes(1)
  })

  describe('offscreen pause', () => {
    type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void
    let notify: ObserverCallback
    const disconnect = vi.fn()

    beforeEach(() => {
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor(callback: ObserverCallback) {
            notify = callback
          }
          observe = vi.fn()
          disconnect = disconnect
        },
      )
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('stays idle with no renderer until the first intersection', async () => {
      mockMatchMedia(false)
      mockWebGL2(true)
      const build = vi.fn((): SceneHandle => ({ render: vi.fn(), dispose: vi.fn() }))

      const { container } = render(<SceneRuntime fallback={<div />} build={build} />)
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(container.querySelector('[data-scene-status]')).toHaveAttribute(
        'data-scene-status',
        'idle',
      )
      expect(rendererCtor).not.toHaveBeenCalled()

      act(() => {
        notify([{ isIntersecting: true }])
      })
      await waitFor(() => {
        expect(container.querySelector('[data-scene-status]')).toHaveAttribute(
          'data-scene-status',
          'active',
        )
      })
      expect(rendererCtor).toHaveBeenCalledTimes(1)
    })

    it('cancels the frame request offscreen, resumes on return, and keeps scene time continuous', async () => {
      mockMatchMedia(false)
      mockWebGL2(true)
      let frameCallback: FrameRequestCallback = () => undefined
      let nextId = 0
      const requestFrame = vi.fn((callback: FrameRequestCallback) => {
        frameCallback = callback
        nextId += 1
        return nextId
      })
      const cancelFrame = vi.fn()
      vi.stubGlobal('requestAnimationFrame', requestFrame)
      vi.stubGlobal('cancelAnimationFrame', cancelFrame)
      const sceneRender = vi.fn()
      const build = vi.fn((): SceneHandle => ({ render: sceneRender, dispose: vi.fn() }))

      const { container, unmount } = render(
        <SceneRuntime fallback={<div />} build={build} />,
      )
      act(() => {
        notify([{ isIntersecting: true }])
      })
      await waitFor(() => {
        expect(container.querySelector('[data-scene-status]')).toHaveAttribute(
          'data-scene-status',
          'active',
        )
      })

      frameCallback(1000)
      frameCallback(1016)
      expect(sceneRender).toHaveBeenLastCalledWith(16)

      const requestsBeforePause = requestFrame.mock.calls.length
      act(() => {
        notify([{ isIntersecting: false }])
      })
      expect(cancelFrame).toHaveBeenCalledWith(nextId)
      expect(requestFrame).toHaveBeenCalledTimes(requestsBeforePause)

      act(() => {
        notify([{ isIntersecting: true }])
      })
      expect(requestFrame).toHaveBeenCalledTimes(requestsBeforePause + 1)

      frameCallback(60_000)
      expect(sceneRender).toHaveBeenLastCalledWith(16)
      frameCallback(60_016)
      expect(sceneRender).toHaveBeenLastCalledWith(32)

      unmount()
      expect(disconnect).toHaveBeenCalledTimes(1)
    })
  })
})
