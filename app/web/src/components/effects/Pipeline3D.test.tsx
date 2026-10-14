import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const spies = vi.hoisted(() => ({
  rendererCtor: vi.fn(),
  rendererDispose: vi.fn(),
  forceContextLoss: vi.fn(),
  geometryDispose: vi.fn(),
  materialDispose: vi.fn(),
  render: vi.fn(),
  materialParams: vi.fn(),
  setAttribute: vi.fn(),
  bufferAttribute: vi.fn(),
}))

vi.mock('three', () => {
  return {
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
      bottom = -1
      updateProjectionMatrix = vi.fn()
    },
    Color: class {
      setStyle() {
        return this
      }
    },
    BufferGeometry: class {
      dispose = spies.geometryDispose
      setAttribute = spies.setAttribute
    },
    BufferAttribute: spies.bufferAttribute,
    ShaderMaterial: class {
      dispose = spies.materialDispose
      constructor(params: unknown) {
        spies.materialParams(params)
      }
    },
    Points: class {
      frustumCulled = true
    },
  }
})

import { motionValue } from 'motion/react'
import { PipelineSection } from '../sections/PipelineSection'
import { MOTION_STORAGE_KEY, MotionPauseProvider } from '../motion/MotionPauseProvider'
import { retrievalPipeline } from '@/content/substance'
import { Pipeline3D } from './Pipeline3D'
import {
  PACKET_COUNT,
  PACKET_END,
  PACKET_LEAD,
  PACKET_START,
  PARTICLE_COUNT,
} from './pipelinePath'
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

describe('Pipeline3D', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('ResizeObserver', StubResizeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
    delete document.documentElement.dataset.motion
  })

  it('falls back and builds nothing under reduced motion', () => {
    mockMatchMedia(true)
    mockWebGL2(true)
    const { container } = render(<Pipeline3D stages={retrievalPipeline.stages} />)
    expect(status(container)).toBe('fallback')
    expect(spies.rendererCtor).not.toHaveBeenCalled()
  })

  it('falls back when WebGL2 is unavailable', () => {
    mockMatchMedia(false)
    mockWebGL2(false)
    const { container } = render(<Pipeline3D stages={retrievalPipeline.stages} />)
    expect(status(container)).toBe('fallback')
    expect(spies.rendererCtor).not.toHaveBeenCalled()
  })

  it('renders no text of its own and is hidden from assistive tech', () => {
    mockMatchMedia(true)
    mockWebGL2(false)
    const { container } = render(<Pipeline3D stages={retrievalPipeline.stages} />)
    expect(container.textContent).toBe('')
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('disposes everything on unmount', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    const { container, unmount } = render(
      <Pipeline3D stages={retrievalPipeline.stages} />,
    )
    await waitFor(() => {
      expect(status(container)).toBe('active')
    })
    unmount()
    expect(spies.geometryDispose).toHaveBeenCalledTimes(1)
    expect(spies.materialDispose).toHaveBeenCalledTimes(1)
    expect(spies.rendererDispose).toHaveBeenCalledTimes(1)
    expect(spies.forceContextLoss).toHaveBeenCalledTimes(1)
  })

  it('sizes points with the live pixel ratio after a resolution step', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    vi.stubGlobal('devicePixelRatio', 2)
    const frames = stubFrames()
    const { container } = render(<Pipeline3D stages={retrievalPipeline.stages} />)
    await waitFor(() => {
      expect(status(container)).toBe('active')
    })

    frames(1, 16)
    expect(uniform('uPixelRatio')).toBe(1.5)

    frames(30, 33)
    expect(container.querySelector('[data-scene-tier]')).toHaveAttribute(
      'data-scene-tier',
      '1',
    )
    expect(uniform('uPixelRatio')).toBe(1)
  })

  function shaders() {
    const params = spies.materialParams.mock.calls.at(-1)?.[0] as
      | {
          vertexShader: string
          fragmentShader: string
          uniforms: Record<string, { value: unknown }>
        }
      | undefined
    return params!
  }

  it('tags exactly the packet share of particles with aPacket', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    const { container } = render(<Pipeline3D stages={retrievalPipeline.stages} />)
    await waitFor(() => {
      expect(status(container)).toBe('active')
    })
    const names = spies.setAttribute.mock.calls.map(([name]) => name as string)
    expect(names).toEqual(['position', 'aPacket'])
    const flags = spies.bufferAttribute.mock.calls
      .map(([array, itemSize]) => ({ array: array as Float32Array, itemSize }))
      .find(({ itemSize }) => itemSize === 1)!.array
    expect(flags).toHaveLength(PARTICLE_COUNT)
    expect(flags.reduce((sum, flag) => sum + flag, 0)).toBe(PACKET_COUNT)
    expect(PACKET_COUNT).toBe(40)
  })

  it('writes the section progress to uProgress on each rendered frame', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    const frames = stubFrames()
    const progress = motionValue(0.2)
    const { container } = render(
      <Pipeline3D stages={retrievalPipeline.stages} progress={progress} />,
    )
    await waitFor(() => {
      expect(status(container)).toBe('active')
    })
    frames(1, 16)
    expect(uniform('uProgress')).toBeCloseTo(0.2)
    act(() => {
      progress.set(0.55)
    })
    frames(1, 16)
    expect(uniform('uProgress')).toBeCloseTo(0.55)
  })

  it('holds the packet frame while motion is paused', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'paused')
    const frames = stubFrames()
    const progress = motionValue(0.4)
    const { container } = render(
      <MotionPauseProvider>
        <Pipeline3D stages={retrievalPipeline.stages} progress={progress} />
      </MotionPauseProvider>,
    )
    await waitFor(() => {
      expect(status(container)).toBe('active')
    })
    const drawn = spies.render.mock.calls.length
    act(() => {
      progress.set(0.6)
    })
    frames(5, 16)
    expect(spies.render.mock.calls.length).toBe(drawn)
    expect(drawn).toBeGreaterThan(0)
    expect(uniform('uProgress')).toBeCloseTo(0.4)
  })

  it('keeps colour to the one accent uniform and puts no comments in either shader', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    const { container } = render(<Pipeline3D stages={retrievalPipeline.stages} />)
    await waitFor(() => {
      expect(status(container)).toBe('active')
    })
    const { vertexShader, fragmentShader, uniforms } = shaders()
    for (const source of [vertexShader, fragmentShader]) {
      expect(source).not.toMatch(/\/\/|\/\*/)
      expect(source).not.toMatch(/vec3\(\s*-?[\d.]+\s*,/)
    }
    expect(fragmentShader.match(/uniform vec3 /g)).toHaveLength(1)
    expect(fragmentShader).toContain('uniform vec3 uColor;')
    expect(vertexShader).not.toContain('uColor')
    const colourUniforms = Object.entries(uniforms).filter(
      ([, entry]) => typeof entry.value === 'object',
    )
    expect(colourUniforms.map(([name]) => name)).toEqual(['uColor'])
  })

  it('runs the packet over the same window the diagram stages use', async () => {
    mockMatchMedia(false)
    mockWebGL2(true)
    const { container } = render(<Pipeline3D stages={retrievalPipeline.stages} />)
    await waitFor(() => {
      expect(status(container)).toBe('active')
    })
    const { vertexShader } = shaders()
    expect(vertexShader).toContain('uniform float uProgress;')
    expect(vertexShader).toContain(
      `(uProgress - ${PACKET_START.toFixed(4)}) / ${(PACKET_END - PACKET_START).toFixed(4)}`,
    )
    expect(vertexShader).toContain(`-${PACKET_LEAD.toFixed(4)} + travel`)
  })
})

describe('PipelineSection', () => {
  it('keeps the SVG description and stage labels from the shared content', () => {
    mockMatchMedia(true)
    mockWebGL2(false)
    const { container } = render(<PipelineSection />)
    expect(container.querySelector('svg desc')?.textContent).toBe(
      retrievalPipeline.description,
    )
    expect(container.querySelectorAll('svg[role="img"] circle')).toHaveLength(
      retrievalPipeline.stages.length,
    )
  })

  it('sizes to its content with no minimum-height band', () => {
    mockMatchMedia(true)
    mockWebGL2(false)
    const { container } = render(<PipelineSection />)
    expect(container.querySelector('[class*="min-h-"]')).toBeNull()
  })
})
