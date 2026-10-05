import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { motionScene } from './motionScene'

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

const scene = vi.fn(() => <div data-testid="scene" />)
const Gated = motionScene(scene)

describe('motionScene', () => {
  it('renders the scene when motion is allowed', () => {
    mockMatchMedia(false)
    render(<Gated className="layer" fallback={<span data-testid="fallback" />} />)
    expect(screen.getByTestId('scene')).toBeInTheDocument()
    expect(screen.queryByTestId('fallback')).not.toBeInTheDocument()
  })

  it('never renders the scene under reduced motion and shows its fallback instead', () => {
    mockMatchMedia(true)
    scene.mockClear()
    const { container } = render(
      <Gated className="layer" fallback={<span data-testid="fallback" />} />,
    )
    expect(scene).not.toHaveBeenCalled()
    const slot = container.firstElementChild
    expect(slot).toHaveAttribute('data-scene-status', 'fallback')
    expect(slot).toHaveClass('layer')
    expect(screen.getByTestId('fallback')).toBeInTheDocument()
  })
})
