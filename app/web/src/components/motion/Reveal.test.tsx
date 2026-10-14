import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Reveal } from './Reveal'
import { splitWords } from './splitWords'

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
    const wrapper = await waitFor(() => {
      const shown = container.querySelector<HTMLElement>('[data-reveal="shown"]')
      expect(shown).not.toBeNull()
      return shown
    })
    expect(wrapper?.style.opacity).toBe('')
    expect(wrapper?.style.transform).toBe('')
    vi.restoreAllMocks()
  })

  it('still hides content below the fold so it can rise into view', async () => {
    mockMatchMedia(false)
    mockRect(window.innerHeight + 100)
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      },
    )
    const { container } = render(
      <Reveal>
        <p>content</p>
      </Reveal>,
    )
    const wrapper = await waitFor(() => {
      const animated = container.querySelector<HTMLElement>('[data-reveal=""]')
      expect(animated).not.toBeNull()
      return animated
    })
    expect(wrapper?.style.opacity).toBe('0')
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
})

describe('Reveal className', () => {
  it('wraps reduced-motion children in a div carrying the class', () => {
    mockMatchMedia(true)
    const { container } = render(
      <Reveal className="lg:row-span-2">
        <p>content</p>
      </Reveal>,
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.tagName).toBe('DIV')
    expect(wrapper).toHaveClass('lg:row-span-2')
    expect(wrapper).toContainElement(screen.getByText('content'))
  })

  it('puts the class on the motion-mode wrapper', () => {
    mockMatchMedia(false)
    const { container } = render(
      <Reveal className="lg:row-span-2">
        <p>content</p>
      </Reveal>,
    )
    expect(container.firstElementChild).toHaveClass('lg:row-span-2')
  })
})

describe('Reveal words variant', () => {
  it('keeps the accessible text and tags each word with its index', () => {
    mockMatchMedia(false)
    const { container } = render(
      <Reveal variant="words">
        <h2>{splitWords('Built to last, shipped')}</h2>
      </Reveal>,
    )
    expect(
      screen.getByRole('heading', { name: 'Built to last, shipped' }),
    ).toBeInTheDocument()
    const words = Array.from(container.querySelectorAll<HTMLElement>('[data-word]'))
    expect(words.map((w) => w.textContent)).toEqual(['Built', 'to', 'last,', 'shipped'])
    expect(words.map((w) => w.style.getPropertyValue('--i'))).toEqual([
      '0',
      '1',
      '2',
      '3',
    ])
  })

  it('does not fade or translate the wrapper', () => {
    mockMatchMedia(false)
    const { container } = render(
      <Reveal variant="words">
        <h2>{splitWords('one two')}</h2>
      </Reveal>,
    )
    const wrapper = container.querySelector<HTMLElement>('[data-reveal]')
    expect(wrapper).not.toBeNull()
    expect(wrapper?.style.opacity).toBe('')
    expect(wrapper?.style.transform).toBe('')
  })

  it('marks the wrapper shown once in view', async () => {
    mockMatchMedia(false)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 100,
    } as DOMRect)
    const { container } = render(
      <Reveal variant="words">
        <h2>{splitWords('one two')}</h2>
      </Reveal>,
    )
    await waitFor(() => {
      expect(container.querySelector('[data-reveal="shown"]')).not.toBeNull()
    })
    vi.restoreAllMocks()
  })

  it('renders plain children under reduced motion', () => {
    mockMatchMedia(true)
    const { container } = render(
      <Reveal variant="words">
        <h2>{splitWords('one two')}</h2>
      </Reveal>,
    )
    expect(container.querySelector('[data-reveal]')).toBeNull()
    expect(screen.getByRole('heading', { name: 'one two' })).toBeInTheDocument()
  })
})
