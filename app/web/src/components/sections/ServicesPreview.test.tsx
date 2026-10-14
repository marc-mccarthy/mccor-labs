import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ServicesPreview } from './ServicesPreview'
import { services } from '@/content/services'
import { ui } from '@/content/ui'

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

describe('ServicesPreview', () => {
  it('renders every service title and outcome', () => {
    mockMatchMedia(false)
    render(<ServicesPreview />)
    expect(services).toHaveLength(5)
    for (const service of services) {
      expect(screen.getByText(service.title)).toBeInTheDocument()
      expect(screen.getByText(service.outcome)).toBeInTheDocument()
    }
  })

  it('puts an h2 above the h3 service titles', () => {
    mockMatchMedia(false)
    render(<ServicesPreview />)
    expect(
      screen.getByRole('heading', { level: 2, name: ui.servicesHeading }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(services.length)
  })

  it('renders the numbered eyebrow outside the h2', () => {
    mockMatchMedia(false)
    render(<ServicesPreview />)
    const eyebrow = screen.getByText(ui.eyebrows.services)
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(eyebrow.closest('h2')).toBeNull()
  })

  it('labels the featured card from content', () => {
    mockMatchMedia(false)
    render(<ServicesPreview />)
    expect(screen.getByText(ui.featured)).toBeInTheDocument()
  })

  it('links each service to its anchor on /services/', () => {
    mockMatchMedia(false)
    render(<ServicesPreview />)
    for (const service of services) {
      expect(
        screen.getByRole('link', { name: new RegExp(service.title) }),
      ).toHaveAttribute('href', `/services/#${service.slug}`)
    }
  })

  it('distinguishes the AI entry from the others', () => {
    mockMatchMedia(false)
    render(<ServicesPreview />)
    const ai = screen.getByText('AI Integration').closest('[data-service]')
    const other = screen.getByText('Websites').closest('[data-service]')
    expect(ai).toHaveAttribute('data-featured', 'true')
    expect(other).not.toHaveAttribute('data-featured')
  })

  it('spans the featured grid item across rows and columns', () => {
    mockMatchMedia(false)
    render(<ServicesPreview />)
    const featured = document.querySelector('[data-featured]')
    expect(featured).not.toBeNull()
    const item = featured?.parentElement
    expect(item).toHaveClass('lg:row-span-2', 'sm:col-span-2')
    expect(document.querySelectorAll('[data-featured]')).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5)
  })

  it('keeps focus outlines off the stretched link', () => {
    mockMatchMedia(false)
    render(<ServicesPreview />)
    for (const service of services) {
      const link = screen.getByRole('link', { name: new RegExp(service.title) })
      expect(link).toHaveClass('focus-visible:outline-none', 'focus-visible:shadow-none')
      expect(link.className).not.toMatch(/focus-visible:outline-(2|accent|offset)/)
    }
  })

  it('renders all content under reduced motion', () => {
    mockMatchMedia(true)
    render(<ServicesPreview />)
    for (const service of services) {
      expect(screen.getByText(service.outcome)).toBeInTheDocument()
    }
  })
})
