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

import {
  SceneRuntime,
  resetWebGL2Probe,
  type SceneContext,
  type SceneHandle,
} from './SceneRuntime'
import { MotionPauseProvider, useMotionPaused } from '../motion/MotionPauseProvider'

function PauseButton() {
  const { toggle } = useMotionPaused()
  return (
    <button type="button" onClick={toggle}>
      pause
    </button>
  )
}

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

  afterEach(() => {
    vi.unstubAllGlobals()
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
    const resizeDisconnect = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn()
        disconnect = resizeDisconnect
      },
    )
    const build = vi.fn((context: SceneContext): SceneHandle => {
      context.fitToCanvas(vi.fn())
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
    expect(resizeDisconnect).toHaveBeenCalledTimes(1)

    unmount()
    expect(rendererDispose).toHaveBeenCalledTimes(1)
    expect(resizeDisconnect).toHaveBeenCalledTimes(1)
  })

  describe('offscreen pause', () => {
    type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void
    let notify: ObserverCallback
    let notifyPrewarm: ObserverCallback
    const disconnect = vi.fn()
    const prewarmDisconnect = vi.fn()
    const rootMargins: (string | undefined)[] = []

    beforeEach(() => {
      rootMargins.length = 0
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          observe = vi.fn()
          disconnect: () => void
          constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
            rootMargins.push(options?.rootMargin)
            if (options?.rootMargin === undefined) {
              notify = callback
              this.disconnect = disconnect
            } else {
              notifyPrewarm = callback
              this.disconnect = prewarmDisconnect
            }
          }
        },
      )
    })

    function stubFrames() {
      let frameCallback: FrameRequestCallback = () => undefined
      const requestFrame = vi.fn((callback: FrameRequestCallback) => {
        frameCallback = callback
        return requestFrame.mock.calls.length
      })
      vi.stubGlobal('requestAnimationFrame', requestFrame)
      vi.stubGlobal('cancelAnimationFrame', vi.fn())
      let now = 1000
      const frames = (count: number, step: number) => {
        act(() => {
          for (let i = 0; i < count; i += 1) {
            now += step
            frameCallback(now)
          }
        })
      }
      return { requestFrame, frames }
    }

    async function renderActive() {
      const build = vi.fn((): SceneHandle => ({ render: vi.fn(), dispose: vi.fn() }))
      const view = render(<SceneRuntime fallback={<div />} build={build} />)
      act(() => {
        notify([{ isIntersecting: true }])
      })
      await waitFor(() => {
        expect(view.container.querySelector('[data-scene-status]')).toHaveAttribute(
          'data-scene-status',
          'active',
        )
      })
      return view.container.querySelector('[data-scene-status]')
    }

    function pixelRatios() {
      return rendererSetPixelRatio.mock.calls.map(([ratio]: unknown[]) => ratio)
    }

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

    it('keeps scene time continuous across a hidden tab', async () => {
      mockMatchMedia(false)
      mockWebGL2(true)
      let frameCallback: FrameRequestCallback = () => undefined
      vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        frameCallback = callback
        return 1
      })
      vi.stubGlobal('cancelAnimationFrame', vi.fn())
      const sceneRender = vi.fn()
      const build = vi.fn((): SceneHandle => ({ render: sceneRender, dispose: vi.fn() }))

      const { container } = render(<SceneRuntime fallback={<div />} build={build} />)
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

      document.dispatchEvent(new Event('visibilitychange'))
      frameCallback(60_000)
      expect(sceneRender).toHaveBeenLastCalledWith(16)
      frameCallback(60_016)
      expect(sceneRender).toHaveBeenLastCalledWith(32)
    })

    it('pre-warms with a 25% 0px observer that builds and draws one frame before entry', async () => {
      mockMatchMedia(false)
      mockWebGL2(true)
      const { requestFrame } = stubFrames()
      const sceneRender = vi.fn()
      const build = vi.fn((): SceneHandle => ({ render: sceneRender, dispose: vi.fn() }))

      const { container, unmount } = render(
        <SceneRuntime fallback={<div data-testid="fallback" />} build={build} />,
      )
      expect(rootMargins).toEqual(['25% 0px', undefined])

      act(() => {
        notifyPrewarm([{ isIntersecting: false }])
      })
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(container.querySelector('[data-scene-status]')).toHaveAttribute(
        'data-scene-status',
        'idle',
      )
      expect(rendererCtor).not.toHaveBeenCalled()

      act(() => {
        notifyPrewarm([{ isIntersecting: true }])
      })
      expect(prewarmDisconnect).toHaveBeenCalledTimes(1)
      await waitFor(() => {
        expect(container.querySelector('[data-scene-status]')).toHaveAttribute(
          'data-scene-status',
          'active',
        )
      })
      expect(build).toHaveBeenCalledTimes(1)
      expect(rendererCtor).toHaveBeenCalledTimes(1)
      expect(sceneRender).toHaveBeenCalledTimes(1)
      expect(requestFrame).not.toHaveBeenCalled()

      act(() => {
        notify([{ isIntersecting: true }])
      })
      expect(requestFrame).toHaveBeenCalledTimes(1)
      expect(build).toHaveBeenCalledTimes(1)
      expect(rendererCtor).toHaveBeenCalledTimes(1)

      unmount()
      expect(disconnect).toHaveBeenCalledTimes(1)
    })

    describe('adaptive resolution', () => {
      it('caps the start ratio at 1.5 and steps down to 1 then 0.75 under sustained 33 ms frames, never back up', async () => {
        mockMatchMedia(false)
        mockWebGL2(true)
        vi.stubGlobal('devicePixelRatio', 3)
        const { frames } = stubFrames()

        const root = await renderActive()
        expect(pixelRatios()).toEqual([1.5])
        expect(root).toHaveAttribute('data-scene-tier', '0')

        frames(30, 33)
        expect(pixelRatios()).toEqual([1.5])
        frames(1, 33)
        expect(pixelRatios()).toEqual([1.5, 1])
        expect(root).toHaveAttribute('data-scene-tier', '1')

        frames(29, 33)
        expect(pixelRatios()).toEqual([1.5, 1])
        frames(1, 33)
        expect(pixelRatios()).toEqual([1.5, 1, 0.75])
        expect(root).toHaveAttribute('data-scene-tier', '2')

        frames(120, 33)
        frames(120, 16)
        expect(pixelRatios()).toEqual([1.5, 1, 0.75])
        expect(root).toHaveAttribute('data-scene-tier', '2')
      })

      it('starts a ratio-1 display at 1 and steps only to 0.75', async () => {
        mockMatchMedia(false)
        mockWebGL2(true)
        vi.stubGlobal('devicePixelRatio', 1)
        const { frames } = stubFrames()

        const root = await renderActive()
        frames(200, 33)
        expect(pixelRatios()).toEqual([1, 0.75])
        expect(root).toHaveAttribute('data-scene-tier', '1')
      })

      it('keeps the start ratio under 16 ms frames', async () => {
        mockMatchMedia(false)
        mockWebGL2(true)
        vi.stubGlobal('devicePixelRatio', 2)
        const { frames } = stubFrames()

        const root = await renderActive()
        frames(300, 16)
        expect(pixelRatios()).toEqual([1.5])
        expect(root).toHaveAttribute('data-scene-tier', '0')
      })

      it('does not step down for one long frame among fast ones', async () => {
        mockMatchMedia(false)
        mockWebGL2(true)
        vi.stubGlobal('devicePixelRatio', 2)
        const { frames } = stubFrames()

        await renderActive()
        frames(20, 16)
        frames(1, 400)
        frames(60, 16)
        expect(pixelRatios()).toEqual([1.5])
      })

      it('ignores the gap across an offscreen pause', async () => {
        mockMatchMedia(false)
        mockWebGL2(true)
        vi.stubGlobal('devicePixelRatio', 2)
        const { frames } = stubFrames()

        await renderActive()
        frames(30, 19)
        act(() => {
          notify([{ isIntersecting: false }])
        })
        act(() => {
          notify([{ isIntersecting: true }])
        })
        frames(1, 60_000)
        frames(100, 19)
        expect(pixelRatios()).toEqual([1.5])
      })

      it('ignores the gap across a hidden tab', async () => {
        mockMatchMedia(false)
        mockWebGL2(true)
        vi.stubGlobal('devicePixelRatio', 2)
        const { frames } = stubFrames()

        await renderActive()
        frames(30, 19)
        document.dispatchEvent(new Event('visibilitychange'))
        frames(1, 60_000)
        frames(100, 19)
        expect(pixelRatios()).toEqual([1.5])
      })
    })

    describe('frame stats', () => {
      function samplesFor(root: Element | null) {
        const samples = window.__sceneStats?.[root?.getAttribute('data-scene-key') ?? '']
        if (!samples) throw new Error('no samples recorded')
        return samples
      }

      afterEach(() => {
        delete window.__sceneStats
      })

      it('records nothing without the flag', async () => {
        mockMatchMedia(false)
        mockWebGL2(true)
        const { frames } = stubFrames()
        await renderActive()
        frames(5, 16)
        expect(window.__sceneStats).toBeUndefined()
      })

      it('records render duration with the flag', async () => {
        mockMatchMedia(false)
        mockWebGL2(true)
        window.__sceneStats = {}
        const { frames } = stubFrames()
        const root = await renderActive()
        frames(5, 16)
        const samples = samplesFor(root)
        expect(samples.count).toBe(5)
        expect(samples.render).toHaveLength(5)
        expect(samples.render.every((value) => value >= 0)).toBe(true)
        expect(samples.gap.slice(1)).toEqual([16, 16, 16, 16])
      })

      it('keeps at most 600 samples per scene', async () => {
        mockMatchMedia(false)
        mockWebGL2(true)
        window.__sceneStats = {}
        const { frames } = stubFrames()
        const root = await renderActive()
        frames(700, 16)
        const samples = samplesFor(root)
        expect(samples.count).toBe(700)
        expect(samples.render).toHaveLength(600)
        expect(samples.gap).toHaveLength(600)
      })
    })

    describe('motion pause', () => {
      afterEach(() => {
        localStorage.clear()
        delete document.documentElement.dataset.motion
      })

      it('holds the last frame with no frame request while paused and resumes on unpause', async () => {
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
        const build = vi.fn((): SceneHandle => ({
          render: sceneRender,
          dispose: vi.fn(),
        }))

        const { container } = render(
          <MotionPauseProvider>
            <PauseButton />
            <SceneRuntime fallback={<div data-testid="fallback" />} build={build} />
          </MotionPauseProvider>,
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
        const root = container.querySelector('[data-scene-status]')
        expect(root).not.toHaveAttribute('data-scene-paused')
        frameCallback(1000)
        frameCallback(1016)
        expect(sceneRender).toHaveBeenLastCalledWith(16)

        const requestsBeforePause = requestFrame.mock.calls.length
        act(() => {
          screen.getByRole('button', { name: 'pause' }).click()
        })
        expect(cancelFrame).toHaveBeenCalledWith(nextId)
        expect(root).toHaveAttribute('data-scene-paused')
        expect(root).toHaveAttribute('data-scene-status', 'active')
        expect(screen.queryByTestId('fallback')).not.toBeInTheDocument()
        expect(rendererCtor).toHaveBeenCalledTimes(1)

        act(() => {
          notify([{ isIntersecting: false }])
          notify([{ isIntersecting: true }])
        })
        expect(requestFrame).toHaveBeenCalledTimes(requestsBeforePause)

        act(() => {
          screen.getByRole('button', { name: 'pause' }).click()
        })
        expect(root).not.toHaveAttribute('data-scene-paused')
        expect(requestFrame).toHaveBeenCalledTimes(requestsBeforePause + 1)
        frameCallback(60_000)
        frameCallback(60_016)
        expect(sceneRender).toHaveBeenLastCalledWith(32)
        expect(rendererCtor).toHaveBeenCalledTimes(1)
        expect(build).toHaveBeenCalledTimes(1)
      })

      it('draws one still frame and requests none when it becomes active while paused', async () => {
        mockMatchMedia(false)
        mockWebGL2(true)
        const requestFrame = vi.fn(() => 1)
        vi.stubGlobal('requestAnimationFrame', requestFrame)
        vi.stubGlobal('cancelAnimationFrame', vi.fn())
        const sceneRender = vi.fn()
        const build = vi.fn((): SceneHandle => ({
          render: sceneRender,
          dispose: vi.fn(),
        }))

        const { container } = render(
          <MotionPauseProvider>
            <PauseButton />
            <SceneRuntime fallback={<div />} build={build} />
          </MotionPauseProvider>,
        )
        act(() => {
          screen.getByRole('button', { name: 'pause' }).click()
        })
        act(() => {
          notify([{ isIntersecting: true }])
        })
        await waitFor(() => {
          expect(container.querySelector('[data-scene-status]')).toHaveAttribute(
            'data-scene-status',
            'active',
          )
        })
        expect(sceneRender).toHaveBeenCalledTimes(1)
        expect(requestFrame).not.toHaveBeenCalled()
        expect(container.querySelector('[data-scene-status]')).toHaveAttribute(
          'data-scene-paused',
        )
      })
    })
  })
})
