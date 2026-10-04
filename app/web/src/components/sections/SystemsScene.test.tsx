import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemsScene } from './SystemsScene'
import { ui } from '@/content/ui'

vi.mock('@/components/effects/NodeLatticeScene', () => ({
  NodeLatticeScene: ({ className }: { className?: string }) => (
    <div data-testid="lattice" className={className} />
  ),
}))

function mockMatchMedia(reduced: boolean, desktop = false) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches:
      (reduced && query === '(prefers-reduced-motion: reduce)') ||
      (desktop && query === '(min-width: 768px)'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe('SystemsScene', () => {
  it('renders the heading and copy outside the effect wrapper', async () => {
    mockMatchMedia(false)
    render(<SystemsScene />)
    const heading = screen.getByRole('heading', { name: ui.systemsHeading })
    expect(screen.getByText(ui.systemsBody)).toBeInTheDocument()
    expect(await screen.findByTestId('lattice')).not.toContainElement(heading)
  })

  it('renders the text-free lattice poster and never the condemned stag poster', () => {
    mockMatchMedia(false)
    const { container } = render(<SystemsScene />)
    const src = screen.getByTestId('systems-poster').getAttribute('src') ?? ''
    expect(src).toContain('systems-lattice.webp')
    expect(container.innerHTML).not.toContain('mccor-stag-systems')
  })

  it('does not hide the heading from assistive tech and renders exactly one section', () => {
    mockMatchMedia(false)
    const { container } = render(<SystemsScene />)
    const heading = screen.getByRole('heading', { name: ui.systemsHeading })
    expect(heading.closest('[aria-hidden="true"]')).toBeNull()
    expect(container.querySelectorAll('section')).toHaveLength(1)
  })

  it('renders all content without pinning under reduced motion', () => {
    mockMatchMedia(true)
    const { container } = render(<SystemsScene />)
    expect(screen.getByRole('heading', { name: ui.systemsHeading })).toBeInTheDocument()
    expect(screen.getByText(ui.systemsBody)).toBeInTheDocument()
    expect(screen.getByTestId('systems-poster').getAttribute('src') ?? '').toContain(
      'systems-lattice.webp',
    )
    expect(container.querySelector('[style*="sticky"]')).toBeNull()
  })

  describe('camera-push video', () => {
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

    function settle(isIntersecting: boolean) {
      act(() => {
        vi.runAllTimers()
      })
      act(() => {
        intersect(isIntersecting)
      })
    }

    it('attaches the muted webm-then-mp4 loop on desktop once the section is on screen', () => {
      mockMatchMedia(false, true)
      const { container } = render(<SystemsScene />)
      settle(false)
      expect(container.querySelector('video')).toBeNull()
      act(() => {
        intersect(true)
      })
      const video = screen.getByTestId<HTMLVideoElement>('systems-video')
      expect(video.muted && video.loop && video.autoplay).toBe(true)
      expect(video).toHaveAttribute('preload', 'none')
      expect(video).toHaveAttribute('aria-hidden', 'true')
      expect(
        [...video.querySelectorAll('source')].map((source) =>
          source.getAttribute('type'),
        ),
      ).toEqual(['video/webm', 'video/mp4'])
      expect(screen.getByTestId('systems-poster')).toBeInTheDocument()
    })

    it('keeps the poster only below 768 px', () => {
      mockMatchMedia(false, false)
      const { container } = render(<SystemsScene />)
      settle(true)
      expect(container.querySelector('video')).toBeNull()
    })

    it('keeps the poster only under reduced motion', () => {
      mockMatchMedia(true, true)
      const { container } = render(<SystemsScene />)
      settle(true)
      expect(container.querySelector('video')).toBeNull()
    })

    it('keeps the poster only under Save-Data', () => {
      mockMatchMedia(false, true)
      vi.stubGlobal(
        'navigator',
        Object.assign(Object.create(navigator) as Navigator, {
          connection: { saveData: true },
        }),
      )
      const { container } = render(<SystemsScene />)
      settle(true)
      expect(container.querySelector('video')).toBeNull()
    })
  })
})
