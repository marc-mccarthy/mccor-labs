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
}))

vi.mock('three', () => ({
  LinearSRGBColorSpace: 'srgb-linear',
  WebGLRenderer: class {
    dispose = spies.rendererDispose
    forceContextLoss = spies.forceContextLoss
    setPixelRatio = vi.fn()
    setSize = vi.fn()
    render = vi.fn()
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
    updateProjectionMatrix = vi.fn()
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
})
