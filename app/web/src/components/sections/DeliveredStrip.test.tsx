import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DeliveredStrip } from './DeliveredStrip'
import { proof } from '@/content/proof'

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

describe('DeliveredStrip', () => {
  it('renders both proof points', () => {
    mockMatchMedia(false)
    render(<DeliveredStrip />)
    for (const point of proof) {
      expect(screen.getByText(point.text)).toBeInTheDocument()
    }
  })

  it('renders an h2 label above the proof points', () => {
    mockMatchMedia(false)
    render(<DeliveredStrip />)
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('sets the proof points in the mono face', () => {
    mockMatchMedia(false)
    render(<DeliveredStrip />)
    for (const point of proof) {
      expect(screen.getByText(point.text)).toHaveClass('font-mono')
    }
  })

  it('renders each proof point inside Stagger', () => {
    mockMatchMedia(false)
    render(<DeliveredStrip />)
    for (const point of proof) {
      expect(screen.getByText(point.text).closest('[data-reveal]')).not.toBeNull()
    }
  })

  it('draws one decorative signal sweep', () => {
    mockMatchMedia(false)
    const { container } = render(<DeliveredStrip />)
    const sweeps = container.querySelectorAll('[data-signal-sweep]')
    expect(sweeps).toHaveLength(1)
    expect(sweeps[0]).toHaveAttribute('aria-hidden', 'true')
  })

  it('numbers the proof points with accent indices hidden from assistive tech', () => {
    mockMatchMedia(false)
    render(<DeliveredStrip />)
    for (const index of ['01', '02']) {
      const label = screen.getByText(index)
      expect(label).toHaveClass('font-mono', 'text-accent')
      expect(label).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('lifts the claims to text-xl text-text', () => {
    mockMatchMedia(false)
    render(<DeliveredStrip />)
    for (const point of proof) {
      expect(screen.getByText(point.text)).toHaveClass('text-xl', 'text-text')
    }
  })
})
