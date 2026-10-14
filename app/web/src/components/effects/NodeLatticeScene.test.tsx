import { render, waitFor } from '@testing-library/react'
import { motionValue } from 'motion/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const spies = vi.hoisted(() => ({
  rendererCtor: vi.fn(),
  rendererDispose: vi.fn(),
  forceContextLoss: vi.fn(),
  geometryDispose: vi.fn(),
  materialDispose: vi.fn(),
  instancedDispose: vi.fn(),
  setMatrixAt: vi.fn(),
  setPosition: vi.fn(),
  render: vi.fn(),
  lenis: null as { velocity: number } | null,
  group: null as { scale: { y: number } } | null,
}))

vi.mock('../motion/LenisProvider', () => ({
  useLenis: () => spies.lenis,
}))

vi.mock('three', () => ({
  LinearSRGBColorSpace: 'srgb-linear',
  AdditiveBlending: 2,
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
  Group: class {
    rotation = { y: 0 }
    scale = { y: 1 }
    add = vi.fn()
    constructor() {
      spies.group = this
    }
  },
  PerspectiveCamera: class {
    aspect = 1
    position = { z: 0 }
    updateProjectionMatrix = vi.fn()
  },
  Color: class {
    setStyle() {
      return this
    }
  },
  Matrix4: class {
    setPosition = spies.setPosition
  },
  IcosahedronGeometry: class {
    dispose = spies.geometryDispose
  },
  BufferGeometry: class {
    dispose = spies.geometryDispose
    setAttribute = vi.fn()
    setIndex = vi.fn()
  },
  BufferAttribute: vi.fn(),
  ShaderMaterial: class {
    dispose = spies.materialDispose
  },
  InstancedMesh: class {
    setMatrixAt = spies.setMatrixAt
    dispose = spies.instancedDispose
    frustumCulled = true
  },
  LineSegments: class {
    frustumCulled = true
  },
}))

import { NodeLatticeScene } from './NodeLatticeScene'
import { resetWebGL2Probe } from './SceneRuntime'
import { HEADLINE_CLEAR_MIN_X, NODE_COUNT } from './nodeLattice'

class StubResizeObserver {
  observe = vi.fn()
  disconnect = vi.fn()
}

function mockMatchMedia(reduced: boolean, wide = false) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches:
      (reduced && query === '(prefers-reduced-motion: reduce)') ||
      (wide && query === '(min-width: 1024px)'),
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

const status = (container: HTMLElement) =>
  container.querySelector('[data-scene-status]')?.getAttribute('data-scene-status')

describe('NodeLatticeScene', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('ResizeObserver', StubResizeObserver)
  })

  it('falls back and builds nothing under reduced motion', () => {
    mockMatchMedia(true)
    mockWebGL2(true)
    const { container } = render(<NodeLatticeScene progress={motionValue(0)} />)
    expect(status(container)).toBe('fallback')
    expect(spies.rendererCtor).not.toHaveBeenCalled()
  })

  it('falls back when WebGL2 is unavailable', () => {
    mockMatchMedia(false)
    mockWebGL2(false)
    const { container } = render(<NodeLatticeScene progress={motionValue(0)} />)
    expect(status(container)).toBe('fallback')
    expect(spies.rendererCtor).not.toHaveBeenCalled()
  })

  it('redraws and stretches the lattice while the page scrolls fast', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    let frame: FrameRequestCallback = () => undefined
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frame = callback
        return 1
      }),
    )
    spies.lenis = { velocity: 600 }
    const { container } = render(<NodeLatticeScene progress={motionValue(0.5)} />)
    await waitFor(() => {
      expect(status(container)).toBe('active')
    })
    frame(0)
    const drawsAfterFirstFrame = spies.render.mock.calls.length
    frame(16)
    spies.lenis = null
    expect(spies.render.mock.calls.length).toBe(drawsAfterFirstFrame + 1)
    expect(spies.group!.scale.y).toBeGreaterThan(1)
    expect(spies.group!.scale.y).toBeLessThan(1.12)
  })

  it('places every instance and disposes everything on unmount', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    const { container, unmount } = render(
      <NodeLatticeScene progress={motionValue(0.5)} />,
    )

    await waitFor(() => {
      expect(status(container)).toBe('active')
    })
    expect(spies.setMatrixAt).toHaveBeenCalledTimes(NODE_COUNT)

    unmount()

    expect(spies.geometryDispose).toHaveBeenCalledTimes(2)
    expect(spies.materialDispose).toHaveBeenCalledTimes(1)
    expect(spies.instancedDispose).toHaveBeenCalledTimes(1)
    expect(spies.rendererDispose).toHaveBeenCalledTimes(1)
    expect(spies.forceContextLoss).toHaveBeenCalledTimes(1)
  })

  it.each([
    [true, true],
    [false, false],
  ])('at lg=%s keeps every node clear of the headline: %s', async (wide, clamped) => {
    mockMatchMedia(false, wide)
    mockWebGL2(true)
    const { container } = render(<NodeLatticeScene progress={motionValue(0.5)} />)
    await waitFor(() => {
      expect(status(container)).toBe('active')
    })
    const xs = spies.setPosition.mock.calls.map((call) => Number(call[0]))
    expect(xs).toHaveLength(NODE_COUNT)
    expect(Math.min(...xs) >= HEADLINE_CLEAR_MIN_X).toBe(clamped)
  })
})
