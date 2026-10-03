import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ServicesPreview } from './ServicesPreview'
import { services } from '@/content/services'

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
    const ai = screen.getByText('AI integration').closest('[data-service]')
    const other = screen.getByText('Websites').closest('[data-service]')
    expect(ai).toHaveAttribute('data-featured', 'true')
    expect(other).not.toHaveAttribute('data-featured')
  })

  it('renders all content under reduced motion', () => {
    mockMatchMedia(true)
    render(<ServicesPreview />)
    for (const service of services) {
      expect(screen.getByText(service.outcome)).toBeInTheDocument()
    }
  })
})
