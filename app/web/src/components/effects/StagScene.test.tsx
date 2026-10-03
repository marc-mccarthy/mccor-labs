import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const spies = vi.hoisted(() => ({
  rendererCtor: vi.fn(),
  rendererDispose: vi.fn(),
  forceContextLoss: vi.fn(),
  geometryDispose: vi.fn(),
  materialDispose: vi.fn(),
  setAttribute: vi.fn(),
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
  },
  Points: class {
    position = { x: 0 }
    frustumCulled = true
  },
}))

import { StagScene } from './StagScene'

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

const status = (container: HTMLElement) =>
  container.querySelector('[data-scene-status]')?.getAttribute('data-scene-status')

describe('StagScene', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('ResizeObserver', StubResizeObserver)
    stubFetch(true)
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
})
