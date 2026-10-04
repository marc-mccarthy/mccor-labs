import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('three', () => ({
  WebGLRenderer: class {
    dispose = vi.fn()
    forceContextLoss = vi.fn()
    setPixelRatio = vi.fn()
  },
}))

vi.mock('../motion/LenisProvider', () => ({
  useLenis: () => ({ velocity: 600 }),
}))

import {
  easeVelocity,
  resetWebGL2Probe,
  SceneRuntime,
  type SceneContext,
} from './SceneRuntime'

describe('easeVelocity', () => {
  it('eases toward the scroll velocity, clamped to a unit range', () => {
    expect(easeVelocity(0, 600)).toBeCloseTo(0.1)
    expect(easeVelocity(0.95, 6000)).toBeLessThanOrEqual(1)
    expect(easeVelocity(0, -600)).toBeCloseTo(-0.1)
  })

  it('settles to exactly zero once scrolling stops', () => {
    expect(easeVelocity(0.0005, 0)).toBe(0)
  })
})

describe('SceneRuntime velocity', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('feeds eased Lenis velocity to the scene from the existing render loop', async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    resetWebGL2Probe()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((
      id: string,
    ) => (id === 'webgl2' ? { getExtension: vi.fn(() => null) } : null)) as never)
    let frame: FrameRequestCallback = () => undefined
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frame = callback
        return 1
      }),
    )
    let context: SceneContext | null = null
    const build = vi.fn((built: SceneContext) => {
      context = built
      return { render: vi.fn(), dispose: vi.fn() }
    })

    render(<SceneRuntime fallback={null} build={build} />)
    await waitFor(() => {
      expect(build).toHaveBeenCalled()
    })
    const velocityRef = (context as SceneContext | null)!.velocityRef
    expect(velocityRef.current).toBe(0)
    frame(0)
    frame(16)
    expect(velocityRef.current).toBeGreaterThan(0.1)
    expect(velocityRef.current).toBeLessThan(1)
  })
})
