import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ui } from '@/content/ui'
import { PageHeader } from './PageHeader'

const VIDEO = { webm: '/a-loop.webm', mp4: '/a-loop.mp4' }

function mockMatchMedia(reduced: boolean, desktop: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches:
      (reduced && query === '(prefers-reduced-motion: reduce)') ||
      (desktop && query === '(min-width: 768px)'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

function renderHeader(withVideo = true) {
  return render(
    <PageHeader
      title="Services"
      description="What we build."
      image="/a.webp"
      video={withVideo ? VIDEO : undefined}
    />,
  )
}

describe('PageHeader video', () => {
  let intersect: (isIntersecting: boolean) => void

  beforeEach(() => {
    vi.useFakeTimers()
    intersect = () => undefined
    class MockIntersectionObserver {
      observe = vi.fn()
      disconnect = vi.fn()
      constructor(callback: IntersectionObserverCallback) {
        intersect = (isIntersecting) => {
          callback(
            [{ isIntersecting } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          )
        }
      }
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  function settle() {
    act(() => {
      vi.runAllTimers()
    })
    act(() => {
      intersect(true)
    })
  }

  it('attaches a muted looping webm-then-mp4 video over the unchanged poster on desktop', () => {
    mockMatchMedia(false, true)
    renderHeader()
    expect(screen.queryByTestId('header-video')).toBeNull()
    settle()
    const video = screen.getByTestId<HTMLVideoElement>('header-video')
    expect(video.muted && video.loop && video.autoplay).toBe(true)
    expect(video).toHaveAttribute('preload', 'none')
    expect(video).toHaveAttribute('aria-hidden', 'true')
    expect(
      [...video.querySelectorAll('source')].map((source) => [
        source.getAttribute('src'),
        source.getAttribute('type'),
      ]),
    ).toEqual([
      ['/a-loop.webm', 'video/webm'],
      ['/a-loop.mp4', 'video/mp4'],
    ])
    const image = screen.getByTestId('header-image')
    expect(image).toHaveAttribute('src', '/a.webp')
    expect(image).toHaveAttribute('fetchpriority', 'high')
    expect(image.className).not.toContain('opacity')
  })

  it('shows the pause toggle only while the video is attached', () => {
    mockMatchMedia(false, true)
    renderHeader()
    expect(screen.queryByRole('button', { name: ui.pauseVideo })).toBeNull()
    settle()
    expect(screen.getByRole('button', { name: ui.pauseVideo })).toBeInTheDocument()
  })

  it('renders no video or toggle without the prop', () => {
    mockMatchMedia(false, true)
    renderHeader(false)
    settle()
    expect(screen.queryByTestId('header-video')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders nothing extra under reduced motion', () => {
    mockMatchMedia(true, true)
    renderHeader()
    settle()
    expect(screen.queryByTestId('header-video')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders nothing extra below 768 px', () => {
    mockMatchMedia(false, false)
    renderHeader()
    settle()
    expect(screen.queryByTestId('header-video')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
