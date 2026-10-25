import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StagLogo } from './StagLogo'

describe('StagLogo', () => {
  it('renders color variant image by default', () => {
    const { container } = render(<StagLogo size="md" />)
    const img = container.querySelector('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/media/brand/mccor-stag-logo.svg')
    expect(img).toHaveAttribute('width', '48')
    expect(img).toHaveAttribute('height', '48')
    expect(img).toHaveClass('h-12', 'w-12')
  })

  it('renders monochrome SVG when requested', () => {
    const { container } = render(
      <StagLogo variant="monochrome" size="lg" alt="Stag Mark" />,
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('viewBox', '0 0 1024 1024')
    expect(svg).toHaveClass('h-16', 'w-16')
    expect(screen.getByRole('img', { name: 'Stag Mark' })).toBeInTheDocument()
  })

  it('uses only design token classes for styling', () => {
    const { container } = render(
      <StagLogo variant="monochrome" className="text-accent" />,
    )
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    expect(container.innerHTML).not.toMatch(/\[#/)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('text-accent')
  })

  it('applies accessible alt text correctly', () => {
    const { rerender } = render(<StagLogo alt="McCor Stag Logo" />)
    expect(screen.getByAltText('McCor Stag Logo')).toBeInTheDocument()

    rerender(<StagLogo variant="monochrome" alt="" />)
    const svg = document.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })
})
