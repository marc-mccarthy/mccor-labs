import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const spies = vi.hoisted(() => ({
  rendererCtor: vi.fn(),
  rendererDispose: vi.fn(),
  forceContextLoss: vi.fn(),
  geometryDispose: vi.fn(),
  materialDispose: vi.fn(),
  render: vi.fn(),
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
      setAttribute = vi.fn()
    },
    BufferAttribute: vi.fn(),
    ShaderMaterial: class {
      dispose = spies.materialDispose
    },
    Points: class {
      frustumCulled = true
    },
  }
})

import { PipelineSection } from '../sections/PipelineSection'
import { retrievalPipeline } from '@/content/substance'
import { Pipeline3D } from './Pipeline3D'
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

const status = (container: HTMLElement) =>
  container.querySelector('[data-scene-status]')?.getAttribute('data-scene-status')

describe('Pipeline3D', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('ResizeObserver', StubResizeObserver)
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
})
