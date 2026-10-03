import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const on = vi.fn(() => () => undefined)
const destroy = vi.fn()
const raf = vi.fn()

vi.mock('lenis', () => ({
  default: class MockLenis {
    on = on
    destroy = destroy
    raf = raf
  },
}))

import { LenisProvider } from './LenisProvider'
import { Parallax } from './Parallax'

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

describe('Parallax', () => {
  it('renders its children', () => {
    mockMatchMedia(false)
    render(<Parallax>content</Parallax>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('applies no transform under reduced motion', () => {
    mockMatchMedia(true)
    render(
      <Parallax>
        <p>content</p>
      </Parallax>,
    )
    const node = screen.getByText('content')
    expect(getComputedStyle(node).transform).toBe('')
  })

  it('subscribes to the Lenis scroll event when a real provider supplies an instance', () => {
    mockMatchMedia(false)
    render(
      <LenisProvider>
        <Parallax>
          <p>content</p>
        </Parallax>
      </LenisProvider>,
    )
    expect(on).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
