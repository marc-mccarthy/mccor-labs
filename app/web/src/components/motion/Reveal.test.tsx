import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Reveal } from './Reveal'

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

describe('Reveal', () => {
  it('renders its children', () => {
    mockMatchMedia(false)
    render(<Reveal>content</Reveal>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('renders children at full opacity with no transform and no animation wrapper under reduced motion', () => {
    mockMatchMedia(true)
    const { container } = render(
      <Reveal>
        <p>content</p>
      </Reveal>,
    )
    const node = screen.getByText('content')
    expect(container.firstElementChild).toBe(node)
    expect(container.querySelector('[data-reveal]')).toBeNull()
    const style = getComputedStyle(node)
    expect(style.opacity).not.toBe('0')
    expect(style.transform).toBe('')
  })
})

describe('Reveal before the animation chunk loads', () => {
  it('marks the wrapper as pending', async () => {
    vi.resetModules()
    vi.doMock('./features', () => ({
      loadDomAnimationFeatures: () => new Promise(() => undefined),
    }))
    mockMatchMedia(false)
    const { Reveal: PendingReveal } = await import('./Reveal')
    const { container } = render(
      <PendingReveal>
        <p>content</p>
      </PendingReveal>,
    )
    expect(container.querySelector('[data-reveal="pending"]')).not.toBeNull()
    vi.doUnmock('./features')
  })
})

describe('Reveal when the animation chunk fails', () => {
  it('leaves content visible', async () => {
    vi.resetModules()
    vi.doMock('./features', () => ({
      loadDomAnimationFeatures: () => Promise.reject(new Error('chunk failed')),
    }))
    mockMatchMedia(false)
    const { Reveal: FailingReveal } = await import('./Reveal')
    const { container } = render(
      <FailingReveal>
        <p>content</p>
      </FailingReveal>,
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(getComputedStyle(screen.getByText('content')).opacity).not.toBe('0')
    expect((container.firstElementChild as HTMLElement).style.opacity).toBe('')
    expect(container.querySelector('[data-reveal="failed"]')).not.toBeNull()
    expect(container.querySelector('[data-reveal="pending"]')).toBeNull()
    vi.doUnmock('./features')
  })
})

describe('Reveal once the animation chunk loads', () => {
  function mockRect(top: number) {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top,
      bottom: top + 100,
    } as DOMRect)
  }

  it('leaves content already in the viewport visible instead of hiding it to animate', async () => {
    mockMatchMedia(false)
    mockRect(0)
    const { container } = render(
      <Reveal>
        <p>content</p>
      </Reveal>,
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    const wrapper = container.querySelector<HTMLElement>('[data-reveal="shown"]')
    expect(wrapper).not.toBeNull()
    expect(wrapper?.style.opacity).toBe('')
    expect(wrapper?.style.transform).toBe('')
    vi.restoreAllMocks()
  })

  it('still hides content below the fold so it can rise into view', async () => {
    mockMatchMedia(false)
    mockRect(window.innerHeight + 100)
    const { container } = render(
      <Reveal>
        <p>content</p>
      </Reveal>,
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    const wrapper = container.querySelector<HTMLElement>('[data-reveal=""]')
    expect(wrapper).not.toBeNull()
    expect(wrapper?.style.opacity).toBe('0')
    vi.restoreAllMocks()
  })
})
