import { team } from '@/content/team'
import { portraits, type PortraitSlug } from '@/lib/portraits'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { TeamGrid } from './TeamGrid'

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

  it('renders member names as h2 so the about page heading order holds', () => {
    mockMatchMedia(false)
    render(<TeamGrid />)
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(team.length)
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  it('renders every member as a photograph with explicit width and height', () => {
    mockMatchMedia(false)
    render(<TeamGrid />)
    expect(screen.getAllByRole('img')).toHaveLength(team.length)
    for (const member of team) {
      const image = screen.getByAltText(`Portrait of ${member.name}`)
      const portrait = portraits[member.mediaSlot as PortraitSlug]
      if (!portrait) throw new Error(`${member.name} portrait missing`)
      expect(image).toHaveAttribute('width', String(portrait.width))
      expect(image).toHaveAttribute('height', String(portrait.height))
      expect(image).toHaveAttribute('src', `/${portrait.webp}`)
      const avif = image.closest('picture')?.querySelector('source[type="image/avif"]')
      expect(avif).toHaveAttribute('srcset', `/${portrait.avif}`)
    }
  })

  it('gives every member a published portrait', () => {
    for (const member of team) {
      expect(portraits[member.mediaSlot as PortraitSlug]).toBeDefined()
    }
  })

  it('renders a single section and all members under reduced motion', () => {
    mockMatchMedia(true)
    const { container } = render(<TeamGrid />)
    expect(container.querySelectorAll('section')).toHaveLength(1)
    for (const member of team) {
      expect(screen.getByText(member.name)).toBeVisible()
    }
  })

  it('emits no raw color value', () => {
    const source = readFileSync('src/components/sections/TeamGrid.tsx', 'utf8')
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|\[#/)
  })
})
