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
    vi.doUnmock('./features')
  })
})
