import { afterEach, describe, expect, it, vi } from 'vitest'

describe('loadThree', () => {
  afterEach(() => {
    vi.doUnmock('three')
    vi.resetModules()
  })

  it('retries the import after a rejected first attempt instead of caching the failure', async () => {
    let attempts = 0
    vi.doMock('three', () => {
      attempts += 1
      if (attempts === 1) throw new Error('chunk load failed')
      return { WebGLRenderer: vi.fn() }
    })
    const { loadThree } = await import('./SceneRuntime')

    await expect(loadThree()).rejects.toThrow()
    await expect(loadThree()).resolves.toHaveProperty('WebGLRenderer')
    expect(attempts).toBe(2)
  })
})
