import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INTRO_STORAGE_KEY, VideoMotionHero } from './VideoMotionHero'
import {
  MOTION_STORAGE_KEY,
  MotionPauseProvider,
  useMotionPaused,
} from './MotionPauseProvider'
import { ui } from '@/content/ui'

function PauseButton() {
  const { toggle } = useMotionPaused()
  return (
    <button type="button" onClick={toggle}>
      motion
    </button>
  )
}

function renderPausableHero() {
  return render(
    <MotionPauseProvider>
      <PauseButton />
      <VideoMotionHero
        posterSrc="/poster.webp"
        webmSrc="/loop.webm"
        videoSrc="/loop.mp4"
      />
    </MotionPauseProvider>,
  )
}

function mockLiveMatchMedia() {
  const state = { reduced: false }
  const listeners = new Set<() => void>()
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return state.reduced && query === '(prefers-reduced-motion: reduce)'
    },
    media: query,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }))
  return (reduced: boolean) => {
    state.reduced = reduced
    act(() => {
      for (const listener of listeners) listener()
    })
  }
}

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

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void

function mockIntersectionObserver(initiallyVisible: boolean) {
  const callbacks: ObserverCallback[] = []
  class MockIntersectionObserver {
    constructor(private readonly callback: ObserverCallback) {
      callbacks.push(callback)
    }
    observe() {
      this.callback([{ isIntersecting: initiallyVisible }])
    }
    disconnect = vi.fn()
  }
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  return (isIntersecting: boolean) => {
    act(() => {
      callbacks.forEach((callback) => {
        callback([{ isIntersecting }])
      })
    })
  }
}

describe('VideoMotionHero', () => {
  let pause: ReturnType<typeof vi.fn<() => void>>
  let load: ReturnType<typeof vi.fn<() => void>>

  beforeEach(() => {
    vi.useFakeTimers()
    mockIntersectionObserver(true)
    pause = vi.fn<() => void>()
    load = vi.fn<() => void>()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause)
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(load)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
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

  it('keeps a paused video paused after a back/forward cache restore', () => {
    mockMatchMedia(false)
    renderHero()
    act(() => {
      vi.runAllTimers()
    })
    fireEvent.click(screen.getByRole('button', { name: ui.pauseVideo }))
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    act(() => {
      window.dispatchEvent(pageshow(true))
    })
    expect(screen.getByRole('button', { name: ui.pauseVideo })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
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
    const resume = screen.getByRole('button', { name: ui.pauseVideo })
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

  it('pauses the video when the hero leaves the viewport', () => {
    mockMatchMedia(false)
    const report = mockIntersectionObserver(false)
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    const { container } = renderHero()
    act(() => {
      vi.runAllTimers()
    })
    expect(container.querySelector('video')).toBeNull()
    report(true)
    expect(container.querySelector('video')).not.toBeNull()
    pause.mockClear()
    report(false)
    expect(pause).toHaveBeenCalledTimes(1)
    report(true)
    expect(play).toHaveBeenCalled()
  })

  describe('motion pause', () => {
    afterEach(() => {
      localStorage.clear()
      delete document.documentElement.dataset.motion
    })

    it('pauses the attached video while motion is paused and plays it again on unpause', () => {
      mockMatchMedia(false)
      const play = vi
        .spyOn(HTMLMediaElement.prototype, 'play')
        .mockResolvedValue(undefined)
      const { container } = renderPausableHero()
      act(() => {
        vi.runAllTimers()
      })
      expect(container.querySelector('video')).not.toBeNull()
      pause.mockClear()

      fireEvent.click(screen.getByRole('button', { name: 'motion' }))
      expect(pause).toHaveBeenCalled()
      expect(screen.getByRole('button', { name: ui.pauseVideo })).toHaveAttribute(
        'aria-pressed',
        'true',
      )

      play.mockClear()
      fireEvent.click(screen.getByRole('button', { name: 'motion' }))
      act(() => {
        vi.runAllTimers()
      })
      expect(play).toHaveBeenCalled()
      expect(screen.getByRole('button', { name: ui.pauseVideo })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    })

    it('ignores the video toggle while motion is paused', () => {
      mockMatchMedia(false)
      const play = vi
        .spyOn(HTMLMediaElement.prototype, 'play')
        .mockResolvedValue(undefined)
      renderPausableHero()
      act(() => {
        vi.runAllTimers()
      })
      fireEvent.click(screen.getByRole('button', { name: 'motion' }))
      play.mockClear()
      fireEvent.click(screen.getByRole('button', { name: ui.pauseVideo }))
      expect(play).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: ui.pauseVideo })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    it('never attaches the video when the page loads paused', () => {
      mockMatchMedia(false)
      localStorage.setItem(MOTION_STORAGE_KEY, 'paused')
      const { container } = renderPausableHero()
      act(() => {
        vi.runAllTimers()
      })
      expect(container.querySelector('video')).toBeNull()
    })

    it('pauses the video when the OS setting turns on after load', () => {
      const setReduced = mockLiveMatchMedia()
      const { container } = renderHero()
      act(() => {
        vi.runAllTimers()
      })
      expect(container.querySelector('video')).not.toBeNull()
      pause.mockClear()
      setReduced(true)
      expect(pause).toHaveBeenCalled()
    })
  })

  describe('intro clip', () => {
    afterEach(() => {
      sessionStorage.clear()
    })

    function renderIntroHero(onIntroChange?: (playing: boolean) => void) {
      return render(
        <VideoMotionHero
          posterSrc="/poster.webp"
          webmSrc="/loop.webm"
          videoSrc="/loop.mp4"
          introWebmSrc="/intro.webm"
          introSrc="/intro.mp4"
          onIntroChange={onIntroChange}
        />,
      )
    }

    function attach() {
      act(() => {
        vi.runAllTimers()
      })
    }

    function sourceOf(container: HTMLElement) {
      return container
        .querySelector('video source[type="video/webm"]')
        ?.getAttribute('src')
    }

    function setPlayback(video: HTMLVideoElement, currentTime: number, duration: number) {
      Object.defineProperty(video, 'duration', { configurable: true, value: duration })
      Object.defineProperty(video, 'currentTime', {
        configurable: true,
        value: currentTime,
      })
    }

    it('plays the intro once without looping on a first visit', () => {
      mockMatchMedia(false)
      const { container } = renderIntroHero()
      attach()
      const video = container.querySelector('video')!
      expect(sourceOf(container)).toBe('/intro.webm')
      expect(video.querySelector('source[type="video/mp4"]')).toHaveAttribute(
        'src',
        '/intro.mp4',
      )
      expect(video.loop).toBe(false)
    })

    it('switches to the looping video when the intro ends', () => {
      mockMatchMedia(false)
      const { container } = renderIntroHero()
      attach()
      fireEvent.ended(container.querySelector('video')!)
      expect(sourceOf(container)).toBe('/loop.webm')
      expect(container.querySelector('video')!.loop).toBe(true)
    })

    it('marks the intro as seen once it starts playing', () => {
      mockMatchMedia(false)
      const { container } = renderIntroHero()
      attach()
      expect(sessionStorage.getItem(INTRO_STORAGE_KEY)).toBeNull()
      fireEvent.play(container.querySelector('video')!)
      expect(sessionStorage.getItem(INTRO_STORAGE_KEY)).toBe('1')
    })

    it('goes straight to the loop when the intro was already seen this session', () => {
      mockMatchMedia(false)
      sessionStorage.setItem(INTRO_STORAGE_KEY, '1')
      const { container } = renderIntroHero()
      attach()
      expect(sourceOf(container)).toBe('/loop.webm')
      expect(container.querySelector('video')!.loop).toBe(true)
    })

    it('falls back to the loop when the intro fails to load', () => {
      mockMatchMedia(false)
      const { container } = renderIntroHero()
      attach()
      fireEvent.error(container.querySelector('video source[type="video/mp4"]')!)
      expect(sourceOf(container)).toBe('/loop.webm')
    })

    it('fades the intro out to the poster just before it ends', () => {
      mockMatchMedia(false)
      const { container } = renderIntroHero()
      attach()
      const video = container.querySelector('video')!
      fireEvent.canPlay(video)
      expect(video).toHaveClass('opacity-100')
      setPlayback(video, 3, 5)
      fireEvent.timeUpdate(video)
      expect(video).toHaveClass('opacity-100')
      setPlayback(video, 4.5, 5)
      fireEvent.timeUpdate(video)
      expect(video).toHaveClass('opacity-0')
      expect(container.querySelector('img')).toHaveClass('opacity-100')
    })

    it('reports the intro as playing until it starts fading out', () => {
      mockMatchMedia(false)
      const onIntroChange = vi.fn<(playing: boolean) => void>()
      const { container } = renderIntroHero(onIntroChange)
      attach()
      const video = container.querySelector('video')!
      expect(onIntroChange).toHaveBeenLastCalledWith(false)
      fireEvent.play(video)
      expect(onIntroChange).toHaveBeenLastCalledWith(true)
      setPlayback(video, 4.5, 5)
      fireEvent.timeUpdate(video)
      expect(onIntroChange).toHaveBeenLastCalledWith(false)
    })

    it('does not report the intro as playing while it is paused', () => {
      mockMatchMedia(false)
      vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
      const onIntroChange = vi.fn<(playing: boolean) => void>()
      const { container } = renderIntroHero(onIntroChange)
      attach()
      fireEvent.play(container.querySelector('video')!)
      expect(onIntroChange).toHaveBeenLastCalledWith(true)
      fireEvent.click(screen.getByRole('button', { name: ui.pauseVideo }))
      expect(onIntroChange).toHaveBeenLastCalledWith(false)
    })

    it('falls back to the loop when the intro fails to decode', () => {
      mockMatchMedia(false)
      const { container } = renderIntroHero()
      attach()
      fireEvent.error(container.querySelector('video')!)
      expect(sourceOf(container)).toBe('/loop.webm')
    })

    it('falls back to the loop when a webm-only intro fails to load', () => {
      mockMatchMedia(false)
      const { container } = render(
        <VideoMotionHero
          posterSrc="/poster.webp"
          webmSrc="/loop.webm"
          videoSrc="/loop.mp4"
          introWebmSrc="/intro.webm"
        />,
      )
      attach()
      fireEvent.error(container.querySelector('video source[type="video/webm"]')!)
      expect(sourceOf(container)).toBe('/loop.webm')
    })

    it('keeps the loop from autoplaying after a fallback while the video is paused', () => {
      mockMatchMedia(false)
      const { container } = renderIntroHero()
      attach()
      fireEvent.click(screen.getByRole('button', { name: ui.pauseVideo }))
      fireEvent.error(container.querySelector('video')!)
      expect(sourceOf(container)).toBe('/loop.webm')
      expect(container.querySelector('video')!.autoplay).toBe(false)
    })

    it('never plays the intro under reduced motion', () => {
      mockMatchMedia(true)
      const onIntroChange = vi.fn<(playing: boolean) => void>()
      const { container } = renderIntroHero(onIntroChange)
      attach()
      expect(container.querySelector('video')).toBeNull()
      expect(onIntroChange).not.toHaveBeenCalledWith(true)
    })
  })
})
