import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VideoMotionHero } from './VideoMotionHero'

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

function renderHero() {
  return render(
    <VideoMotionHero
      posterSrc="/poster.webp"
      webmSrc="/loop.webm"
      videoSrc="/loop.mp4"
    />,
  )
}

describe('VideoMotionHero', () => {
  let pause: ReturnType<typeof vi.fn<() => void>>
  let load: ReturnType<typeof vi.fn<() => void>>

  beforeEach(() => {
    vi.useFakeTimers()
    pause = vi.fn<() => void>()
    load = vi.fn<() => void>()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause)
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(load)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('attaches the video after the page has loaded', () => {
    mockMatchMedia(false)
    const { container } = renderHero()
    expect(container.querySelector('video')).toBeNull()
    act(() => {
      vi.runAllTimers()
    })
    expect(container.querySelector('video source')).not.toBeNull()
  })

  it('never attaches the video when the page is hidden first', () => {
    mockMatchMedia(false)
    const { container } = renderHero()
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
      vi.runAllTimers()
    })
    expect(container.querySelector('video')).toBeNull()
  })

  it('cancels the video download on pagehide', () => {
    mockMatchMedia(false)
    const { container } = renderHero()
    act(() => {
      vi.runAllTimers()
    })
    const video = container.querySelector('video')
    const sources = [...(video?.querySelectorAll('source') ?? [])]
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(pause).toHaveBeenCalled()
    expect(load).toHaveBeenCalled()
    expect(sources.every((source) => !source.hasAttribute('src'))).toBe(true)
    expect(container.querySelector('video')).toBeNull()
  })

  it('skips the video under reduced motion', () => {
    mockMatchMedia(true)
    const { container } = renderHero()
    act(() => {
      vi.runAllTimers()
    })
    expect(container.querySelector('video')).toBeNull()
  })
})
