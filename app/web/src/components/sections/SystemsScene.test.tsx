import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemsScene } from './SystemsScene'
import {
  MOTION_STORAGE_KEY,
  MotionPauseProvider,
} from '@/components/motion/MotionPauseProvider'
import { ui } from '@/content/ui'

type LatticeModule = typeof import('@/components/effects/NodeLatticeScene')
type LatticeProps = Parameters<LatticeModule['NodeLatticeScene']>[0]

vi.mock('@/components/effects/NodeLatticeScene', async (importOriginal) => {
  const { useLatticeGates } = await importOriginal<LatticeModule>()
  return {
    NodeLatticeScene: ({
      className,
      progress,
      gatePinUnits,
      gateListRef,
    }: LatticeProps) => {
      useLatticeGates(progress, gatePinUnits, gateListRef)
      return <div data-testid="lattice" className={className} />
    },
  }
})

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
  it('renders the numbered eyebrow above the h2', () => {
    mockMatchMedia(false)
    render(<SystemsScene />)
    const eyebrow = screen.getByTestId('eyebrow-tick').parentElement!
    expect(within(eyebrow).getByText(ui.eyebrows.evaluation)).toBeInTheDocument()
    expect(within(eyebrow).getByText('02')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: ui.systemsHeading }),
    ).toBeInTheDocument()
  })

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

  function gateStates() {
    return within(screen.getByTestId('systems-gates'))
      .getAllByRole('listitem')
      .map((gate) => gate.getAttribute('data-state'))
  }

  it('lists the three gates as text inside an ordered list', () => {
    mockMatchMedia(false)
    render(<SystemsScene />)
    const list = screen.getByTestId('systems-gates')
    expect(list.tagName).toBe('OL')
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((gate) => gate.textContent),
    ).toEqual([...ui.systemsGates])
    expect(list.closest('[aria-live]')).toBeNull()
    expect(list.querySelector('[aria-current]')).toBeNull()
  })

  it('renders every gate passed under reduced motion', () => {
    mockMatchMedia(true)
    render(<SystemsScene />)
    expect(gateStates()).toEqual(['passed', 'passed', 'passed'])
  })

  it.each([true, false])(
    'always renders the evaluation link with press feedback (reduced=%s)',
    (reduced) => {
      mockMatchMedia(reduced)
      render(<SystemsScene />)
      const link = screen.getByRole('link', { name: ui.systemsLink })
      expect(link).toHaveAttribute('href', '/services/#ai-engineering')
      expect(link).toHaveClass('press')
      expect(link).not.toHaveAttribute('tabindex')
      expect(link.closest('[aria-hidden="true"]')).toBeNull()
    },
  )

  describe('gate states while scrolling', () => {
    const viewport = window.innerHeight
    const height = viewport * 1.5
    let top = viewport
    const animate = vi.fn()

    function scrollToProgress(progress: number) {
      top = viewport - progress * (viewport + height)
      act(() => {
        window.dispatchEvent(new Event('scroll'))
      })
    }

    beforeEach(() => {
      top = viewport
      animate.mockClear()
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
        () => ({ top, height }) as DOMRect,
      )
      Object.defineProperty(HTMLElement.prototype, 'animate', {
        configurable: true,
        value: animate,
      })
    })

    afterEach(() => {
      vi.restoreAllMocks()
      Reflect.deleteProperty(HTMLElement.prototype, 'animate')
      window.localStorage.clear()
      delete document.documentElement.dataset.motion
    })

    async function nextFrame() {
      await act(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
              resolve()
            })
          }),
      )
    }

    it('passes gates in order through the pinned window and pops each new dot', async () => {
      mockMatchMedia(false)
      render(<SystemsScene />)
      expect(gateStates()).toEqual(['pending', 'pending', 'pending'])
      await nextFrame()
      scrollToProgress(0.45)
      expect(gateStates()).toEqual(['passed', 'pending', 'pending'])
      scrollToProgress(0.52)
      expect(gateStates()).toEqual(['passed', 'passed', 'pending'])
      scrollToProgress(0.58)
      expect(gateStates()).toEqual(['passed', 'passed', 'passed'])
      expect(animate).toHaveBeenCalledTimes(3)
      scrollToProgress(0.41)
      expect(gateStates()).toEqual(['pending', 'pending', 'pending'])
      expect(animate).toHaveBeenCalledTimes(3)
    })

    it('never pops dots for the measurement taken on mount', () => {
      mockMatchMedia(false)
      top = viewport - 0.52 * (viewport + height)
      render(<SystemsScene />)
      expect(gateStates()).toEqual(['passed', 'passed', 'pending'])
      expect(animate).not.toHaveBeenCalled()
    })

    it('keeps updating gate states but skips the pop while motion is paused', async () => {
      mockMatchMedia(false)
      window.localStorage.setItem(MOTION_STORAGE_KEY, 'paused')
      render(
        <MotionPauseProvider>
          <SystemsScene />
        </MotionPauseProvider>,
      )
      expect(document.documentElement.dataset.motion).toBe('paused')
      await nextFrame()
      scrollToProgress(0.52)
      expect(gateStates()).toEqual(['passed', 'passed', 'pending'])
      expect(animate).not.toHaveBeenCalled()
    })
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

    it('pauses the loop off screen and resumes it on return', () => {
      mockMatchMedia(false, true)
      const play = vi
        .spyOn(HTMLMediaElement.prototype, 'play')
        .mockResolvedValue(undefined)
      const pause = vi
        .spyOn(HTMLMediaElement.prototype, 'pause')
        .mockImplementation(() => undefined)
      render(<SystemsScene />)
      settle(true)
      expect(screen.getByTestId('systems-video')).toBeInTheDocument()
      act(() => {
        intersect(false)
      })
      expect(pause).toHaveBeenCalledTimes(1)
      expect(play).not.toHaveBeenCalled()
      act(() => {
        intersect(true)
      })
      expect(play).toHaveBeenCalledTimes(1)
      play.mockRestore()
      pause.mockRestore()
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
