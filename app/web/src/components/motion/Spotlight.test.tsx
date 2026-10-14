import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Spotlight } from './Spotlight'

function mockMatchMedia({ fine, reduced }: { fine: boolean; reduced: boolean }) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches:
      (fine && query === '(hover: hover) and (pointer: fine)') ||
      (reduced && query === '(prefers-reduced-motion: reduce)'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

function stubFrames() {
  const frames = new Map<number, FrameRequestCallback>()
  let next = 0
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      next += 1
      frames.set(next, callback)
      return next
    }),
  )
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => {
      frames.delete(id)
    }),
  )
  return {
    pending: () => frames.size,
    flush: () => {
      const queued = [...frames.values()]
      frames.clear()
      queued.forEach((callback) => {
        callback(0)
      })
    },
  }
}

function renderCard(size?: 'card' | 'panel', trigger?: 'hover' | 'focus-within') {
  const { container } = render(
    <div data-card="">
      <Spotlight size={size} trigger={trigger} />
      <p>content</p>
    </div>,
  )
  const card = container.querySelector<HTMLElement>('[data-card]')!
  const rectRead = vi.fn(() => ({ left: 10, top: 20 }) as DOMRect)
  card.getBoundingClientRect = rectRead
  return Object.assign(card, { rectRead })
}

describe('Spotlight', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('tracks the pointer inside the card as CSS variables on a decorative layer', () => {
    mockMatchMedia({ fine: true, reduced: false })
    const frames = stubFrames()
    const card = renderCard()
    fireEvent.pointerMove(card.querySelector('p')!, { clientX: 50, clientY: 70 })
    frames.flush()
    const glow = card.querySelector<HTMLElement>('[data-spotlight]')!
    expect(glow).toHaveAttribute('aria-hidden', 'true')
    expect(glow.style.getPropertyValue('--spot-x')).toBe('40px')
    expect(glow.style.getPropertyValue('--spot-y')).toBe('50px')
  })

  it.each([
    ['a coarse pointer', { fine: false, reduced: false }],
    ['reduced motion', { fine: true, reduced: true }],
  ])('renders nothing under %s', (_label, media) => {
    mockMatchMedia(media)
    const card = renderCard()
    expect(card.querySelector('[data-spotlight]')).toBeNull()
  })

  it('writes at most once per animation frame for several moves', () => {
    mockMatchMedia({ fine: true, reduced: false })
    const frames = stubFrames()
    const card = renderCard()
    const glow = card.querySelector<HTMLElement>('[data-spotlight]')!
    const setProperty = vi.spyOn(glow.style, 'setProperty')
    fireEvent.pointerMove(card, { clientX: 30, clientY: 40 })
    fireEvent.pointerMove(card, { clientX: 40, clientY: 50 })
    fireEvent.pointerMove(card, { clientX: 50, clientY: 70 })
    expect(frames.pending()).toBe(1)
    expect(setProperty).not.toHaveBeenCalled()
    frames.flush()
    expect(setProperty).toHaveBeenCalledTimes(2)
    expect(glow.style.getPropertyValue('--spot-x')).toBe('40px')
    expect(glow.style.getPropertyValue('--spot-y')).toBe('50px')
    fireEvent.pointerMove(card, { clientX: 60, clientY: 80 })
    expect(frames.pending()).toBe(1)
  })

  it('reads the card rect once per pointerenter, not per move', () => {
    mockMatchMedia({ fine: true, reduced: false })
    const frames = stubFrames()
    const card = renderCard()
    fireEvent.pointerEnter(card)
    expect(card.rectRead).toHaveBeenCalledTimes(1)
    fireEvent.pointerMove(card, { clientX: 30, clientY: 40 })
    frames.flush()
    fireEvent.pointerMove(card, { clientX: 40, clientY: 50 })
    frames.flush()
    expect(card.rectRead).toHaveBeenCalledTimes(1)
    fireEvent.pointerEnter(card)
    expect(card.rectRead).toHaveBeenCalledTimes(2)
  })

  it('reads the rect lazily once when a move arrives without a pointerenter', () => {
    mockMatchMedia({ fine: true, reduced: false })
    const frames = stubFrames()
    const card = renderCard()
    fireEvent.pointerMove(card, { clientX: 30, clientY: 40 })
    fireEvent.pointerMove(card, { clientX: 40, clientY: 50 })
    frames.flush()
    expect(card.rectRead).toHaveBeenCalledTimes(1)
  })

  it('re-reads the card rect after the page scrolls', () => {
    mockMatchMedia({ fine: true, reduced: false })
    const frames = stubFrames()
    const card = renderCard()
    fireEvent.pointerEnter(card)
    fireEvent.pointerMove(card, { clientX: 30, clientY: 40 })
    frames.flush()
    expect(card.rectRead).toHaveBeenCalledTimes(1)
    fireEvent.scroll(window)
    fireEvent.pointerMove(card, { clientX: 40, clientY: 50 })
    frames.flush()
    expect(card.rectRead).toHaveBeenCalledTimes(2)
  })

  it('cancels the pending frame and stops listening on unmount', () => {
    mockMatchMedia({ fine: true, reduced: false })
    const frames = stubFrames()
    const card = renderCard()
    fireEvent.pointerMove(card, { clientX: 30, clientY: 40 })
    expect(frames.pending()).toBe(1)
    cleanup()
    expect(frames.pending()).toBe(0)
    fireEvent.pointerMove(card, { clientX: 40, clientY: 50 })
    expect(frames.pending()).toBe(0)
  })

  it('defaults to the hover trigger with no focus-within class and no inline position', () => {
    mockMatchMedia({ fine: true, reduced: false })
    stubFrames()
    const glow = renderCard().querySelector<HTMLElement>('[data-spotlight]')!
    expect(glow.className).toContain('group-hover:opacity-100')
    expect(glow.className).not.toContain('group-focus-within')
    expect(glow.style.getPropertyValue('--spot-x')).toBe('')
    expect(glow.style.getPropertyValue('--spot-y')).toBe('')
  })

  it('adds group-focus-within and a valid default position for the focus-within trigger', () => {
    mockMatchMedia({ fine: true, reduced: false })
    const frames = stubFrames()
    const card = renderCard('card', 'focus-within')
    const glow = card.querySelector<HTMLElement>('[data-spotlight]')!
    expect(glow.className).toContain('group-hover:opacity-100')
    expect(glow.className).toContain('group-focus-within:opacity-100')
    expect(glow.style.getPropertyValue('--spot-x')).toBe('50%')
    expect(glow.style.getPropertyValue('--spot-y')).toBe('0%')
    fireEvent.pointerMove(card, { clientX: 50, clientY: 70 })
    frames.flush()
    expect(glow.style.getPropertyValue('--spot-x')).toBe('40px')
    expect(glow.style.getPropertyValue('--spot-y')).toBe('50px')
  })

  it('uses an 18rem glow by default and 32rem for the panel size', () => {
    mockMatchMedia({ fine: true, reduced: false })
    stubFrames()
    const card = renderCard()
    const glow = card.querySelector<HTMLElement>('[data-spotlight]')!
    expect(glow.style.backgroundImage).toContain('18rem')
    cleanup()
    const panel = renderCard('panel')
    const panelGlow = panel.querySelector<HTMLElement>('[data-spotlight]')!
    expect(panelGlow.style.backgroundImage).toContain('32rem')
    expect(panelGlow.style.backgroundImage).not.toContain('18rem')
  })
})
