import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface Uniform {
  value: unknown
}

interface CapturedMaterial {
  uniforms: Record<string, Uniform>
  fragmentShader: string
  vertexShader: string
}

const spies = vi.hoisted(() => ({
  rendererCtor: vi.fn(),
  rendererDispose: vi.fn(),
  forceContextLoss: vi.fn(),
  geometryDispose: vi.fn(),
  materialDispose: vi.fn(),
  render: vi.fn(),
  lenis: null as { velocity: number } | null,
  material: null as CapturedMaterial | null,
}))

vi.mock('../motion/LenisProvider', () => ({
  useLenis: () => spies.lenis,
}))

vi.mock('three', () => {
  class Vector {
    values: number[] = []
    set(...values: number[]) {
      this.values = values
      return this
    }
  }
  return {
    LinearSRGBColorSpace: 'srgb-linear',
    NoBlending: 0,
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
    Camera: class {
      isCamera = true
    },
    Mesh: class {
      frustumCulled = true
    },
    PlaneGeometry: class {
      dispose = spies.geometryDispose
    },
    ShaderMaterial: class {
      dispose = spies.materialDispose
      constructor(parameters: CapturedMaterial) {
        spies.material = parameters
      }
    },
    Color: class {
      style = ''
      setStyle(style: string) {
        this.style = style
        return this
      }
    },
    Vector2: Vector,
    Vector3: Vector,
    Vector4: Vector,
  }
})

import { ContactBeam, CONTACT_BEAM_QUERY } from '../sections/ContactBeam'
import { MAX_BEND_FRACTION } from './contactBeamPath'
import {
  breath,
  BREATH_PERIOD_SECONDS,
  ContactBeamScene,
  PACKET_PERIOD_SECONDS,
  PACKET_TRAVEL_SECONDS,
  packetGain,
  packetState,
  PATH_POINTS,
} from './ContactBeamScene'
import { resetWebGL2Probe } from './SceneRuntime'

const REDUCE = '(prefers-reduced-motion: reduce)'
const FINE_POINTER = '(hover: hover) and (pointer: fine)'
const BAND_WIDTH = 1440
const BAND_HEIGHT = 540
const TOKENS = {
  '--color-brand': 'probe-brand',
  '--color-glow-red': 'probe-glow-red',
  '--color-accent': 'probe-accent',
} as const

class StubResizeObserver {
  observe = vi.fn()
  disconnect = vi.fn()
}

function mockMedia(matching: readonly string[]) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: matching.includes(query),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

function mockWebGL2() {
  resetWebGL2Probe()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((id: string) =>
    id === 'webgl2' ? { getExtension: vi.fn(() => null) } : null) as never)
}

function captureFrames() {
  const frames: { next: FrameRequestCallback } = { next: () => undefined }
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frames.next = callback
      return 1
    }),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  return frames
}

const status = (container: HTMLElement) =>
  container.querySelector('[data-scene-status]')?.getAttribute('data-scene-status')

function uniform(name: string): unknown {
  const material = spies.material
  if (!material) throw new Error('no material built')
  const entry = material.uniforms[name]
  if (!entry) throw new Error(`no uniform ${name}`)
  return entry.value
}

function colorStyle(name: string): string {
  return (uniform(name) as { style: string }).style
}

function pathPoints(): number[][] {
  return (uniform('uPath') as { values: number[] }[]).map((point) => [...point.values])
}

async function mountActive() {
  const frames = captureFrames()
  const view = render(<ContactBeamScene className="layer" />)
  await waitFor(() => {
    expect(status(view.container)).toBe('active')
  })
  return { frames, ...view }
}

describe('ContactBeamScene', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    spies.lenis = null
    spies.material = null
    vi.stubGlobal('ResizeObserver', StubResizeObserver)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(BAND_WIDTH)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(BAND_HEIGHT)
    for (const [name, value] of Object.entries(TOKENS)) {
      document.documentElement.style.setProperty(name, value)
    }
    mockWebGL2()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    for (const name of Object.keys(TOKENS)) {
      document.documentElement.style.removeProperty(name)
    }
  })

  it('renders its null fallback and never builds three under reduced motion', () => {
    mockMedia([REDUCE, FINE_POINTER, CONTACT_BEAM_QUERY])
    const { container } = render(<ContactBeamScene />)
    expect(status(container)).toBe('fallback')
    expect(container.querySelector('[data-scene-status]')?.children).toHaveLength(1)
    expect(container.querySelector('canvas')).toHaveClass('hidden')
    expect(spies.rendererCtor).not.toHaveBeenCalled()
  })

  it('feeds every colour uniform from its token through ctx.color', async () => {
    mockMedia([FINE_POINTER])
    await mountActive()
    expect(colorStyle('uColorBrand')).toBe(TOKENS['--color-brand'])
    expect(colorStyle('uColorGlowRed')).toBe(TOKENS['--color-glow-red'])
    expect(colorStyle('uColorAccent')).toBe(TOKENS['--color-accent'])
    expect(
      Object.keys(spies.material!.uniforms).filter((name) => name.startsWith('uColor')),
    ).toEqual(['uColorBrand', 'uColorGlowRed', 'uColorAccent'])
  })

  it('keeps colour out of the shader source', async () => {
    mockMedia([FINE_POINTER])
    await mountActive()
    const { fragmentShader, vertexShader } = spies.material!
    for (const source of [fragmentShader, vertexShader]) {
      expect(source).not.toMatch(/\/\/|\/\*/)
      expect(source).not.toMatch(/\bmix\s*\(/)
      expect(source).not.toMatch(/vec3\s*\(\s*[-\d.]/)
    }
    expect(fragmentShader).toContain(`uniform vec2 uPath[${String(PATH_POINTS)}]`)
  })

  it('lays the canvas over the band without taking pointer input', async () => {
    mockMedia([FINE_POINTER])
    const { container } = await mountActive()
    expect(container.querySelector('canvas')).toHaveClass('pointer-events-none')
    expect(container.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('[data-scene-status]')).toHaveClass(
      'mix-blend-screen',
      'layer',
    )
  })

  it('bends the filament toward pointer motion by at most 4% of the band width', async () => {
    mockMedia([FINE_POINTER])
    const { frames } = await mountActive()
    frames.next(0)
    const rest = pathPoints()
    act(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 0, clientY: 0 }))
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 900, clientY: 0 }))
    })
    frames.next(16)
    const middle = Math.floor(PATH_POINTS / 2)
    expect(pathPoints()[middle]![0]!).toBeGreaterThan(rest[middle]![0]!)
    expect(pathPoints()[0]).toEqual(rest[0])
    for (let frame = 2; frame <= 40; frame++) {
      act(() => {
        window.dispatchEvent(
          new PointerEvent('pointermove', { clientX: frame % 2 ? 0 : 900, clientY: 0 }),
        )
      })
      frames.next(frame * 16)
      const shifts = pathPoints().map((point, index) =>
        Math.hypot(point[0]! - rest[index]![0]!, point[1]! - rest[index]![1]!),
      )
      expect(Math.max(...shifts)).toBeLessThanOrEqual(BAND_WIDTH * MAX_BEND_FRACTION)
    }
  })

  it('ignores the pointer when pointer effects are off', async () => {
    mockMedia([])
    const { frames } = await mountActive()
    frames.next(0)
    const rest = pathPoints()
    act(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 0, clientY: 0 }))
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 900, clientY: 0 }))
    })
    frames.next(16)
    expect(pathPoints()).toEqual(rest)
  })

  it('stretches the packet while the page scrolls fast', async () => {
    mockMedia([FINE_POINTER])
    const lenis = { velocity: 0 }
    spies.lenis = lenis
    const { frames } = await mountActive()
    frames.next(0)
    const still = uniform('uPacketLength')
    lenis.velocity = 600
    for (let frame = 1; frame <= 20; frame++) frames.next(frame * 16)
    expect(uniform('uPacketLength')).toBeGreaterThan(still as number)
  })

  it('disposes its geometry, material and context on unmount', async () => {
    mockMedia([FINE_POINTER])
    const { unmount } = await mountActive()
    unmount()
    expect(spies.geometryDispose).toHaveBeenCalledTimes(1)
    expect(spies.materialDispose).toHaveBeenCalledTimes(1)
    expect(spies.rendererDispose).toHaveBeenCalledTimes(1)
    expect(spies.forceContextLoss).toHaveBeenCalledTimes(1)
  })
})

describe('ContactBeamScene timing', () => {
  it('sends one packet per pass on a cadence of 6 s or slower', () => {
    expect(PACKET_PERIOD_SECONDS).toBeGreaterThanOrEqual(6)
    expect(PACKET_TRAVEL_SECONDS).toBeGreaterThanOrEqual(6)
    expect(packetState(0).progress).toBe(0)
    expect(packetState(PACKET_TRAVEL_SECONDS / 2).progress).toBeCloseTo(0.5, 6)
    expect(packetState(PACKET_TRAVEL_SECONDS).progress).toBe(1)
    expect(packetState(PACKET_TRAVEL_SECONDS).arrival).toBe(1)
    expect(packetState(PACKET_PERIOD_SECONDS).progress).toBe(0)
  })

  it('holds the packet at full strength between a short ramp in and out', () => {
    expect(packetGain(0)).toBe(0)
    expect(packetGain(0.075)).toBeCloseTo(0.5, 10)
    expect(packetGain(0.15)).toBe(1)
    expect(packetGain(0.5)).toBe(1)
    expect(packetGain(0.9)).toBeCloseTo(1, 10)
    expect(packetGain(0.95)).toBeCloseTo(0.5, 10)
    expect(packetGain(1)).toBe(0)
  })

  it('breathes the orb bloom on a 4 s cycle', () => {
    expect(BREATH_PERIOD_SECONDS).toBe(4)
    expect(breath(1)).toBeCloseTo(breath(5), 10)
    expect(breath(1)).toBeGreaterThan(breath(0))
    expect(breath(3)).toBeLessThan(breath(0))
  })
})

describe('ContactBeam', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('ResizeObserver', StubResizeObserver)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(BAND_WIDTH)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(BAND_HEIGHT)
    mockWebGL2()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('mounts nothing on a coarse pointer or below md', () => {
    mockMedia([FINE_POINTER])
    const { container } = render(<ContactBeam />)
    expect(container).toBeEmptyDOMElement()
    expect(spies.rendererCtor).not.toHaveBeenCalled()
  })

  it('asks for md and up with a fine hover pointer', () => {
    expect(CONTACT_BEAM_QUERY).toBe(
      '(min-width: 768px) and (hover: hover) and (pointer: fine)',
    )
  })

  it('mounts an empty fallback slot and no canvas under reduced motion', () => {
    mockMedia([REDUCE, FINE_POINTER, CONTACT_BEAM_QUERY])
    const { container } = render(<ContactBeam />)
    expect(status(container)).toBe('fallback')
    expect(container.querySelector('canvas')).toBeNull()
    expect(container.querySelector('[data-scene-status]')).toBeEmptyDOMElement()
    expect(spies.rendererCtor).not.toHaveBeenCalled()
  })

  it('loads the scene at md and up with a fine pointer', async () => {
    mockMedia([FINE_POINTER, CONTACT_BEAM_QUERY])
    captureFrames()
    const { container } = render(<ContactBeam />)
    await waitFor(() => {
      expect(status(container)).toBe('active')
    })
    expect(container.querySelector('[data-scene-status]')).toHaveClass(
      'pointer-events-none',
      'absolute',
      'inset-0',
    )
  })
})
