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

  it('renders SVG stag mark', () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })
})
