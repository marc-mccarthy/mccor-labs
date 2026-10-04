import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TeamGrid } from './TeamGrid'
import { team } from '@/content/team'
import { portraits } from '@/lib/portraits'

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

describe('TeamGrid', () => {
  it('renders every name, role, bio and mailto link', () => {
    mockMatchMedia(false)
    render(<TeamGrid />)
    expect(team).toHaveLength(4)
    for (const member of team) {
      expect(screen.getByRole('heading', { name: member.name })).toBeInTheDocument()
      expect(screen.getByText(member.role)).toBeInTheDocument()
      expect(screen.getByText(member.bio)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: member.email })).toHaveAttribute(
        'href',
        `mailto:${member.email}`,
      )
      expect(member.email.endsWith('@mccorlabs.com')).toBe(true)
    }
  })

  it('renders only Nate as a photograph with explicit width and height', () => {
    mockMatchMedia(false)
    render(<TeamGrid />)
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(1)
    const image = images[0]
    if (!image) throw new Error('image missing')
    const nate = portraits.nateb
    if (!nate) throw new Error('nateb portrait missing')
    expect(image).toHaveAttribute('width', String(nate.width))
    expect(image).toHaveAttribute('height', String(nate.height))
    expect(image).toHaveAttribute('src', `/${nate.webp}`)
    const avif = image.closest('picture')?.querySelector('source[type="image/avif"]')
    expect(avif).toHaveAttribute('srcset', `/${nate.avif}`)
  })

  it('renders a designed panel for each null mediaSlot, not an image', () => {
    mockMatchMedia(false)
    render(<TeamGrid />)
    const nulls = team.filter((member) => member.mediaSlot === null)
    expect(nulls).toHaveLength(3)
    expect(screen.getAllByTestId('team-panel')).toHaveLength(3)
  })

  it('renders a single section and all members under reduced motion', () => {
    mockMatchMedia(true)
    const { container } = render(<TeamGrid />)
    expect(container.querySelectorAll('section')).toHaveLength(1)
    for (const member of team) {
      expect(screen.getByText(member.name)).toBeVisible()
    }
  })

  it('emits no raw colour value', () => {
    const source = readFileSync('src/components/sections/TeamGrid.tsx', 'utf8')
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|\[#/)
  })
})
