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
})
