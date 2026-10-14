import { act, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { activeStage, PIN_UNITS, ProcessScroller, trackShift } from './ProcessScroller'
import { process } from '@/content/process'

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

function hasStickyAncestor(node: HTMLElement): boolean {
  for (let el: HTMLElement | null = node; el; el = el.parentElement) {
    if (getComputedStyle(el).position === 'sticky') return true
  }
  return false
}

const TRACK_WIDTH = 2800
const CLIP_WIDTH = 1104

let top = 0

function mockLayout() {
  mockMatchMedia(false)
  Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true })
  top = 0
  const widths = { scroll: TRACK_WIDTH, client: CLIP_WIDTH }
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () =>
      ({
        top,
        height: 2000,
        bottom: top + 2000,
        left: 0,
        right: 0,
        width: 0,
        x: 0,
        y: top,
      }) as DOMRect,
  )
  vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(
    () => widths.scroll,
  )
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(
    () => widths.client,
  )
  return widths
}

function scrollPinTo(nextTop: number) {
  top = nextTop
  act(() => {
    window.dispatchEvent(new Event('scroll'))
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ProcessScroller', () => {
  it('renders every stage title and duration', () => {
    mockMatchMedia(false)
    render(<ProcessScroller />)
    for (const stage of process) {
      expect(screen.getByRole('heading', { name: stage.title })).toBeInTheDocument()
      expect(screen.getByText(new RegExp(stage.duration))).toBeInTheDocument()
    }
  })

  it.each([false, true])('renders the optional h2 (reduced: %s)', (reduced) => {
    mockMatchMedia(reduced)
    render(<ProcessScroller heading="How it runs" />)
    expect(
      screen.getByRole('heading', { level: 2, name: 'How it runs' }),
    ).toBeInTheDocument()
  })

  it.each([false, true])(
    'renders the eyebrow and glow when asked (reduced: %s)',
    (reduced) => {
      mockMatchMedia(reduced)
      const { container } = render(
        <ProcessScroller
          heading="How it runs"
          eyebrow={{ index: '04', label: 'Engagement' }}
          headingSize="md"
          glow
        />,
      )
      expect(screen.getByText('Engagement')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'How it runs' })).toHaveClass(
        'text-display-md',
      )
      expect(container.querySelector('section')).toHaveClass('relative', 'isolate')
    },
  )

  it('pins the track from md up and stacks it below md when motion is allowed', () => {
    mockMatchMedia(false)
    render(<ProcessScroller />)
    const heading = screen.getByRole('heading', { name: process[0]!.title })
    expect(hasStickyAncestor(heading)).toBe(false)
    expect(heading.closest('.motion-safe\\:md\\:sticky')).not.toBeNull()
    expect(heading.closest('ol')).toHaveClass('flex-col', 'motion-safe:md:flex-row')
  })

  it('renders stacked with no sticky positioning under reduced motion', () => {
    mockMatchMedia(true)
    render(<ProcessScroller />)
    for (const stage of process) {
      const heading = screen.getByRole('heading', { name: stage.title })
      expect(hasStickyAncestor(heading)).toBe(false)
      expect(screen.getByText(new RegExp(stage.duration))).toBeInTheDocument()
    }
  })

  it.each([false, true])('sets aria-hidden on no stage (reduced: %s)', (reduced) => {
    mockMatchMedia(reduced)
    const { container } = render(<ProcessScroller />)
    expect(container.querySelectorAll('[aria-hidden]')).toHaveLength(0)
    expect(container.querySelectorAll('[inert], [hidden]')).toHaveLength(0)
  })

  it('renders exactly one section', () => {
    mockMatchMedia(false)
    const { container } = render(<ProcessScroller />)
    expect(container.querySelectorAll('section')).toHaveLength(1)
  })

  it('server-renders the track at rest', () => {
    mockMatchMedia(false)
    const html = renderToString(<ProcessScroller />)
    expect(html).toContain(`--pin-height:${String(PIN_UNITS)}vh`)
    expect(html).toContain('--track-fraction:0;--track-shift:0px;--active-index:1')
    expect(html).toContain('data-card-state="active"')
  })

  it('writes the track shift on mount and on scroll', () => {
    mockLayout()
    render(<ProcessScroller />)
    const group = screen.getByTestId('process-group')
    expect(group.style.getPropertyValue('--track-shift')).toBe('0px')

    scrollPinTo(-500)
    expect(group.style.getPropertyValue('--track-shift')).toMatch(/px$/)
    expect(parseFloat(group.style.getPropertyValue('--track-shift'))).toBeCloseTo(
      0.5 * (TRACK_WIDTH - CLIP_WIDTH),
      5,
    )
    expect(parseFloat(group.style.getPropertyValue('--track-fraction'))).toBeCloseTo(
      0.5,
      5,
    )
  })

  it('clamps the shift so the last card ends at the container edge at fraction 1', () => {
    expect(trackShift(1, TRACK_WIDTH, CLIP_WIDTH)).toBe(TRACK_WIDTH - CLIP_WIDTH)
    expect(trackShift(1.5, TRACK_WIDTH, CLIP_WIDTH)).toBe(TRACK_WIDTH - CLIP_WIDTH)
    expect(trackShift(-0.5, TRACK_WIDTH, CLIP_WIDTH)).toBe(0)
    expect(trackShift(1, CLIP_WIDTH - 10, CLIP_WIDTH)).toBe(0)

    mockLayout()
    render(<ProcessScroller />)
    scrollPinTo(-5000)
    const shift = parseFloat(
      screen.getByTestId('process-group').style.getPropertyValue('--track-shift'),
    )
    expect(TRACK_WIDTH - shift).toBe(CLIP_WIDTH)
  })

  it('re-measures the track when the clip box resizes', () => {
    const callbacks: ResizeObserverCallback[] = []
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          callbacks.push(callback)
        }
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      },
    )
    const widths = mockLayout()
    render(<ProcessScroller />)
    scrollPinTo(-5000)
    const group = screen.getByTestId('process-group')
    expect(parseFloat(group.style.getPropertyValue('--track-shift'))).toBe(
      TRACK_WIDTH - CLIP_WIDTH,
    )

    widths.scroll = 2000
    widths.client = 800
    act(() => {
      for (const callback of callbacks) callback([], {} as ResizeObserver)
    })
    expect(parseFloat(group.style.getPropertyValue('--track-shift'))).toBe(1200)
  })

  it('derives the active stage from the pinned fraction', () => {
    expect(activeStage(0)).toBe(0)
    expect(activeStage(0.1)).toBe(0)
    expect(activeStage(0.5)).toBe(2)
    expect(activeStage(0.9)).toBe(process.length - 1)
    expect(activeStage(2)).toBe(process.length - 1)

    mockLayout()
    render(<ProcessScroller />)
    const states = () =>
      [...screen.getAllByRole('listitem')].map((item) => item.dataset.cardState)
    expect(states()).toEqual(['active', 'near', 'far', 'far', 'far'])

    scrollPinTo(-500)
    expect(states()).toEqual(['far', 'near', 'active', 'near', 'far'])
    expect(
      screen.getByTestId('process-group').style.getPropertyValue('--active-index'),
    ).toBe('3')
  })

  it('renders the progress rail and counter without DOM text', () => {
    mockMatchMedia(false)
    const { container } = render(<ProcessScroller />)
    const counter = container.querySelector('[data-process-counter]')
    expect(counter).not.toBeNull()
    expect(counter?.textContent).toBe('')
    expect(container.querySelector('[data-process-rail]')?.textContent).toBe('')
  })

  it.each([false, true])(
    'gives no card an opacity class below 100 (reduced: %s)',
    (reduced) => {
      mockMatchMedia(reduced)
      const { container } = render(<ProcessScroller />)
      const cards = container.querySelectorAll('[data-process-card]')
      expect(cards).toHaveLength(process.length)
      const below = [...cards]
        .flatMap((card) => [card, ...card.querySelectorAll('*')])
        .flatMap((node) => [...node.classList])
        .filter((name) => {
          const match = /(?:^|:)opacity-(\d+)$/.exec(name)
          return match !== null && Number(match[1]) < 100
        })
      expect(below).toEqual([])
    },
  )

  it('renders the same element structure with and without reduced motion', () => {
    const structure = (reduced: boolean) => {
      mockMatchMedia(reduced)
      const { container, unmount } = render(
        <ProcessScroller
          heading="How it runs"
          eyebrow={{ index: '04', label: 'E' }}
          glow
        />,
      )
      const nodes = [...container.querySelectorAll('*')].map(
        (node) => `${node.tagName}.${node.getAttribute('class') ?? ''}`,
      )
      unmount()
      return nodes
    }
    expect(structure(true)).toEqual(structure(false))
  })
})
