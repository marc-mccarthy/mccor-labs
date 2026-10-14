import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import NotFound from './not-found'
import { ui } from '@/content/ui'

vi.mock('@/lib/env', () => ({
  env: { siteUrl: 'https://mccorlabs.com', bookingUrl: null, contactEndpoint: null },
}))

describe('NotFound', () => {
  it('keeps its message and home button', () => {
    render(<NotFound />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'That Page Does Not Exist' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the Home Page' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('shows the mono signal-lost eyebrow', () => {
    render(<NotFound />)
    expect(screen.getByText('404 · Signal Lost')).toHaveClass('font-mono')
  })

  it('draws a fixed-size three-node graphic whose crimson edge is motion-safe and stops short', () => {
    const { container } = render(<NotFound />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('viewBox', '0 0 240 48')
    expect(svg).toHaveAttribute('width', '240')
    expect(svg).toHaveAttribute('height', '48')
    expect(svg.querySelectorAll('circle')).toHaveLength(3)
    const edge = svg.querySelector('line')!
    expect(edge).toHaveClass('stroke-brand')
    expect(edge.getAttribute('class')).toContain('motion-safe:animate-[signal-draw_')
    expect(Number(edge.getAttribute('x2'))).toBeLessThan(
      Number(svg.querySelectorAll('circle')[2]!.getAttribute('cx')) - 6,
    )
  })

  it('offers the booking call', () => {
    render(<NotFound />)
    expect(screen.getByRole('link', { name: ui.contactFallback })).toBeInTheDocument()
  })
})
