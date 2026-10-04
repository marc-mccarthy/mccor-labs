import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SystemsScene } from './SystemsScene'
import { ui } from '@/content/ui'

vi.mock('@/components/effects/NodeLatticeScene', () => ({
  NodeLatticeScene: ({ className }: { className?: string }) => (
    <div data-testid="lattice" className={className} />
  ),
}))

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
    expect(container.querySelector('[style*="sticky"]')).toBeNull()
  })
})
