import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Logo } from './Logo'

describe('Logo', () => {
  it('renders brand wordmark by default', () => {
    render(<Logo />)
    expect(screen.getByText(/McCor/i)).toBeInTheDocument()
    expect(screen.getByText(/Labs/i)).toBeInTheDocument()
  })

  it('can hide wordmark for icon-only usage', () => {
    render(<Logo showWordmark={false} />)
    expect(screen.queryByText(/McCor/i)).not.toBeInTheDocument()
  })

  it('uses only design tokens for colour', () => {
    const { container } = render(<Logo />)
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    expect(container.innerHTML).not.toMatch(/\[#/)
  })

  it('renders the decorative shield image at 1x and 2x', () => {
    const { container } = render(<Logo size="sm" />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', '/media/brand/mccor-shield-logo-96.webp')
    expect(img).toHaveAttribute(
      'srcset',
      '/media/brand/mccor-shield-logo-96.webp 1x, /media/brand/mccor-shield-logo-192.webp 2x',
    )
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('width', '33')
    expect(img).toHaveAttribute('height', '40')
    expect(container.querySelector('svg')).toBeNull()
  })
})
