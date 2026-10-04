import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VideoMotionHero } from './VideoMotionHero'
import { ui } from '@/content/ui'

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

  function pageshow(persisted: boolean) {
    const event = new Event('pageshow')
    Object.defineProperty(event, 'persisted', { value: persisted })
    return event
  }

  it('re-attaches the video after a back/forward cache restore', () => {
    mockMatchMedia(false)
    const { container } = renderHero()
    act(() => {
      vi.runAllTimers()
    })
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(container.querySelector('video')).toBeNull()
    act(() => {
      window.dispatchEvent(pageshow(true))
    })
    expect(container.querySelector('video source')).not.toBeNull()
  })

  it('does not re-attach on a pageshow that is not a cache restore', () => {
    mockMatchMedia(false)
    const { container } = renderHero()
    act(() => {
      vi.runAllTimers()
    })
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    act(() => {
      window.dispatchEvent(pageshow(false))
    })
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

  it('shows the pause toggle only while a video is attached', () => {
    mockMatchMedia(false)
    renderHero()
    expect(screen.queryByRole('button')).toBeNull()
    act(() => {
      vi.runAllTimers()
    })
    expect(screen.getByRole('button', { name: ui.pauseVideo })).toBeInTheDocument()
  })

  it('pauses and resumes the video from the toggle', () => {
    mockMatchMedia(false)
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    renderHero()
    act(() => {
      vi.runAllTimers()
    })
    fireEvent.click(screen.getByRole('button', { name: ui.pauseVideo }))
    expect(pause).toHaveBeenCalledTimes(1)
    const resume = screen.getByRole('button', { name: ui.playVideo })
    expect(resume).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(resume)
    expect(play).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: ui.pauseVideo })).toBeInTheDocument()
  })

  it('shows no toggle under reduced motion', () => {
    mockMatchMedia(true)
    renderHero()
    act(() => {
      vi.runAllTimers()
    })
    expect(screen.queryByRole('button')).toBeNull()
  })
})
