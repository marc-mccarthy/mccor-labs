import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const spies = vi.hoisted(() => ({
  rendererCtor: vi.fn(),
  rendererDispose: vi.fn(),
  forceContextLoss: vi.fn(),
  geometryDispose: vi.fn(),
  materialDispose: vi.fn(),
  setAttribute: vi.fn(),
  materialParams: vi.fn(),
  camera: vi.fn(),
  render: vi.fn(),
}))

vi.mock('three', () => ({
  LinearSRGBColorSpace: 'srgb-linear',
  WebGLRenderer: class {
    dispose = spies.rendererDispose
    forceContextLoss = spies.forceContextLoss
    setPixelRatio = vi.fn()
    setSize = vi.fn()
    render = spies.render
    constructor() {
      spies.rendererCtor()
    }
  },
  Scene: class {
    add = vi.fn()
  },
  OrthographicCamera: class {
    left = 0
    right = 0
    top = 0
    bottom = 0
    updateProjectionMatrix = vi.fn()
    constructor() {
      spies.camera(this)
    }
  },
  Color: class {
    setStyle() {
      return this
    }
  },
  Vector2: class {
    set = vi.fn()
  },
  BufferGeometry: class {
    dispose = spies.geometryDispose
    setAttribute = spies.setAttribute
  },
  BufferAttribute: vi.fn(),
  ShaderMaterial: class {
    dispose = spies.materialDispose
    constructor(params: unknown) {
      spies.materialParams(params)
    }
  },
  Points: class {
    position = { x: 0, y: 0, z: 0 }
    scale = { x: 1, y: 1, z: 1 }
    frustumCulled = true
  },
}))

import { StagScene } from './StagScene'
import { resetWebGL2Probe } from './SceneRuntime'
import { MOTION_STORAGE_KEY, MotionPauseProvider } from '../motion/MotionPauseProvider'

class StubResizeObserver {
  observe = vi.fn()
  disconnect = vi.fn()
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
  resetWebGL2Probe()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((id: string) =>
    id === 'webgl2' && available ? { getExtension: vi.fn(() => null) } : null) as never)
}

function stubFetch(ok: boolean) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve({
        ok,
        status: ok ? 200 : 404,
        json: () => Promise.resolve({ count: 2, positions: [0, 0, 0, 1, 1, 0] }),
        text: () => Promise.resolve(url),
      }),
    ),
  )
}

function stubFrames() {
  let frameCallback: FrameRequestCallback = () => undefined
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frameCallback = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  let now = 1000
  return (count: number, step: number) => {
    act(() => {
      for (let i = 0; i < count; i += 1) {
        now += step
        frameCallback(now)
      }
    })
  }
}

function uniform(name: string): number {
  const params = spies.materialParams.mock.calls.at(-1)?.[0] as
    { uniforms: Record<string, { value: number }> } | undefined
  return params?.uniforms[name]?.value ?? Number.NaN
}

function stubFrameQueue() {
  let queue: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    queue.push(callback)
    return queue.length
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  let now = 1000
  return (count: number, step: number) => {
    act(() => {
      for (let i = 0; i < count; i += 1) {
        now += step
        const due = queue
        queue = []
        for (const callback of due) callback(now)
      }
    })
  }
}

function uniformsAt(index: number): Record<string, { value: number }> {
  const params = spies.materialParams.mock.calls[index]?.[0] as
    { uniforms: Record<string, { value: number }> } | undefined
  if (!params) throw new Error(`no material built at ${String(index)}`)
  return params.uniforms
}

function seedCount(): number {
  return spies.setAttribute.mock.calls.filter(([name]) => name === 'aSeed').length
}

function stubInstanceRects(tops: Record<string, number>, height: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const id = this.closest('[data-stag-instance]')?.getAttribute('data-stag-instance')
    const top = id ? (tops[id] ?? 0) : 0
    return {
      top,
      height,
      left: 0,
      width: height,
      right: height,
      bottom: top + height,
    } as DOMRect
  })
}

const sceneRoot = (container: HTMLElement, id: string) =>
  container.querySelector(`[data-stag-instance="${id}"] [data-scene-status]`)

const HERO_HEIGHT = 765

function renderWithHero() {
  const hero = document.createElement('section')
  Object.defineProperty(hero, 'offsetHeight', { value: HERO_HEIGHT })
  vi.stubGlobal('scrollY', 0)
  const result = render(<StagScene fallback={<div />} exitTarget={{ current: hero }} />)
  const scroll = (y: number) => {
    act(() => {
      vi.stubGlobal('scrollY', y)
      window.dispatchEvent(new Event('scroll'))
    })
  }
  return { ...result, scroll }
}

const status = (container: HTMLElement) =>
  container.querySelector('[data-scene-status]')?.getAttribute('data-scene-status')

describe('StagScene', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('ResizeObserver', StubResizeObserver)
    stubFetch(true)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders the fallback and builds nothing under reduced motion', () => {
    mockMatchMedia(true)
    mockWebGL2(true)
    const { getByTestId, container } = render(
      <StagScene fallback={<div data-testid="fallback" />} />,
    )
    expect(getByTestId('fallback')).toBeInTheDocument()
    expect(status(container)).toBe('fallback')
    expect(spies.rendererCtor).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('renders the fallback when WebGL2 is unavailable', () => {
    mockMatchMedia(false)
    mockWebGL2(false)
    const { getByTestId, container } = render(
      <StagScene fallback={<div data-testid="fallback" />} />,
    )
    expect(getByTestId('fallback')).toBeInTheDocument()
    expect(status(container)).toBe('fallback')
    expect(spies.rendererCtor).not.toHaveBeenCalled()
  })

  it('builds the points and disposes geometry, material and renderer on unmount', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    const { container, unmount } = render(<StagScene fallback={<div />} />)

    await waitFor(() => {
      expect(spies.setAttribute).toHaveBeenCalledWith('aSeed', expect.anything())
    })
    expect(spies.setAttribute).toHaveBeenCalledWith('aScatterPos', expect.anything())
    expect(status(container)).toBe('active')

    unmount()

    expect(spies.geometryDispose).toHaveBeenCalledTimes(1)
    expect(spies.materialDispose).toHaveBeenCalledTimes(1)
    expect(spies.forceContextLoss).toHaveBeenCalledTimes(1)
    expect(spies.rendererDispose).toHaveBeenCalledTimes(1)
  })

  it('swaps to the fallback when an asset fails to load', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    stubFetch(false)
    const { getByTestId } = render(
      <StagScene fallback={<div data-testid="fallback" />} />,
    )

    await waitFor(() => {
      expect(spies.forceContextLoss).toHaveBeenCalledTimes(1)
    })
    expect(getByTestId('fallback')).toBeInTheDocument()
    expect(spies.geometryDispose).not.toHaveBeenCalled()
  })

  it('sizes points with the live pixel ratio after a resolution step', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    vi.stubGlobal('devicePixelRatio', 2)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1376)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(768)
    const frames = stubFrames()
    const { container } = render(<StagScene fallback={<div />} />)
    await waitFor(() => {
      expect(spies.setAttribute).toHaveBeenCalledWith('aSeed', expect.anything())
    })
    expect(status(container)).toBe('active')
    const basePointSize = 500 / 170

    frames(1, 16)
    expect(uniform('uPointSize')).toBeCloseTo(basePointSize * 1.5)

    frames(30, 33)
    expect(container.querySelector('[data-scene-tier]')).toHaveAttribute(
      'data-scene-tier',
      '1',
    )
    expect(uniform('uPointSize')).toBeCloseTo(basePointSize)
  })

  it('drives uExit and data-stag-exit from hero scroll and reassembles at the top', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    const { container, scroll } = renderWithHero()
    await waitFor(() => {
      expect(spies.setAttribute).toHaveBeenCalledWith('aSeed', expect.anything())
    })
    const root = container.querySelector('[data-scene-status]')
    expect(uniform('uExit')).toBe(0)
    expect(root).toHaveAttribute('data-stag-exit', '0')

    scroll(0.8 * HERO_HEIGHT)
    expect(uniform('uExit')).toBeGreaterThan(0)
    expect(root).toHaveAttribute('data-stag-exit', '0.9')

    scroll(0)
    expect(uniform('uExit')).toBe(0)
    expect(root).toHaveAttribute('data-stag-exit', '0')
  })

  it('writes data-stag-exit only when the rounded value changes', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    const { container, scroll } = renderWithHero()
    await waitFor(() => {
      expect(spies.setAttribute).toHaveBeenCalledWith('aSeed', expect.anything())
    })
    const root = container.querySelector('[data-scene-status]')
    if (!root) throw new Error('scene root missing')
    const write = vi.spyOn(root, 'setAttribute')

    scroll(0.6 * HERO_HEIGHT)
    scroll(0.6 * HERO_HEIGHT + 2)
    scroll(0.6 * HERO_HEIGHT + 4)
    expect(write.mock.calls.filter(([name]) => name === 'data-stag-exit')).toEqual([
      ['data-stag-exit', '0.4'],
    ])
    expect(uniform('uExit')).toBeGreaterThan(0.4)
  })

  it('leaves uExit at 0 and sets no data-stag-exit without an exit target', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    const { container } = render(<StagScene fallback={<div />} />)
    await waitFor(() => {
      expect(spies.setAttribute).toHaveBeenCalledWith('aSeed', expect.anything())
    })
    act(() => {
      vi.stubGlobal('scrollY', HERO_HEIGHT)
      window.dispatchEvent(new Event('scroll'))
    })
    expect(uniform('uExit')).toBe(0)
    expect(container.querySelector('[data-stag-exit]')).toBeNull()
  })

  it('wraps the scene in a hero instance wrapper with the given class by default', () => {
    mockMatchMedia(false)
    mockWebGL2(false)
    const { container } = render(
      <StagScene className="absolute inset-0" fallback={<div />} />,
    )
    const wrapper = container.querySelector('[data-stag-instance]')
    expect(wrapper).toHaveAttribute('data-stag-instance', 'hero')
    expect(wrapper).toHaveClass('absolute', 'inset-0')
    expect(wrapper?.querySelector('[data-scene-status]')).not.toBeNull()
  })

  it('assembles two instances independently', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    const tops: Record<string, number> = { 'view-a': window.innerHeight + 200 }
    stubInstanceRects(tops, 400)
    const frames = stubFrameQueue()
    const { container } = render(
      <>
        <StagScene instanceId="mount-a" fallback={<div />} />
        <StagScene
          instanceId="view-a"
          assembleOn="view"
          layout="centred"
          fallback={<div />}
        />
      </>,
    )
    await waitFor(() => {
      expect(seedCount()).toBe(2)
    })
    const mountRoot = sceneRoot(container, 'mount-a')
    const viewRoot = sceneRoot(container, 'view-a')
    expect(mountRoot).not.toHaveAttribute('data-stag-assembled')
    expect(viewRoot).not.toHaveAttribute('data-stag-assembled')

    frames(150, 16)
    expect(mountRoot).toHaveAttribute('data-stag-assembled', 'true')
    expect(viewRoot).not.toHaveAttribute('data-stag-assembled')
    expect([uniformsAt(0), uniformsAt(1)].map((u) => u.uProgress?.value).sort()).toEqual([
      0, 1,
    ])

    tops['view-a'] = 0
    frames(150, 16)
    expect(viewRoot).toHaveAttribute('data-stag-assembled', 'true')
    expect(uniformsAt(0).uProgress?.value).toBe(1)
    expect(uniformsAt(1).uProgress?.value).toBe(1)
  })

  it('keeps a mount instance assembled for the session and starts a new id scattered', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    const frames = stubFrameQueue()
    const first = render(<StagScene instanceId="mount-b" fallback={<div />} />)
    await waitFor(() => {
      expect(seedCount()).toBe(1)
    })
    frames(150, 16)
    expect(sceneRoot(first.container, 'mount-b')).toHaveAttribute(
      'data-stag-assembled',
      'true',
    )
    first.unmount()

    const again = render(
      <>
        <StagScene instanceId="mount-b" fallback={<div />} />
        <StagScene instanceId="mount-c" fallback={<div />} />
      </>,
    )
    await waitFor(() => {
      expect(seedCount()).toBe(3)
    })
    expect(sceneRoot(again.container, 'mount-b')).toHaveAttribute(
      'data-stag-assembled',
      'true',
    )
    expect(sceneRoot(again.container, 'mount-c')).not.toHaveAttribute(
      'data-stag-assembled',
    )
    const progress = [uniformsAt(1), uniformsAt(2)].map((u) => u.uProgress?.value).sort()
    expect(progress).toEqual([0, 1])
  })

  it('frames the cloud in the middle of the canvas with the centred layout', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400)
    render(<StagScene instanceId="centred-a" layout="centred" fallback={<div />} />)
    await waitFor(() => {
      expect(seedCount()).toBe(1)
    })
    const camera = spies.camera.mock.calls.at(-1)?.[0] as {
      left: number
      right: number
      top: number
      bottom: number
    }
    expect((camera.left + camera.right) / 2).toBeCloseTo(0.5)
    expect((camera.top + camera.bottom) / 2).toBeCloseTo(0.5)
    expect(1 / (camera.right - camera.left)).toBeCloseTo(0.9)
    expect(1 / (camera.top - camera.bottom)).toBeLessThan(0.9)
  })

  it('draws a formed view stag once its assets load while motion is paused', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    stubInstanceRects({ 'paused-a': window.innerHeight + 200 }, 400)
    stubFrameQueue()
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'paused')
    try {
      const { container } = render(
        <MotionPauseProvider>
          <StagScene instanceId="paused-a" assembleOn="view" fallback={<div />} />
        </MotionPauseProvider>,
      )
      await waitFor(() => {
        expect(seedCount()).toBe(1)
      })
      expect(sceneRoot(container, 'paused-a')).toHaveAttribute(
        'data-stag-assembled',
        'true',
      )
      expect(uniformsAt(0).uProgress?.value).toBe(1)
      expect(spies.render).toHaveBeenCalled()
    } finally {
      window.localStorage.removeItem(MOTION_STORAGE_KEY)
      delete document.documentElement.dataset.motion
    }
  })
})
