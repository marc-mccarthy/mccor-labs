import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  it('renders a plain header with no image when none is given', () => {
    render(<PageHeader title="Careers" description="Join us." />)
    expect(screen.getByRole('heading', { level: 1, name: 'Careers' })).toBeInTheDocument()
    expect(screen.queryByTestId('header-image')).not.toBeInTheDocument()
  })

  it('renders a decorative, eagerly loaded high-priority image band when given one', () => {
    render(<PageHeader title="Services" description="What we build." image="/a.webp" />)
    const image = screen.getByTestId('header-image')
    expect(image).toHaveAttribute('src', '/a.webp')
    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('fetchpriority', 'high')
    expect(image).not.toHaveAttribute('loading', 'lazy')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Services' }),
    ).toBeInTheDocument()
  })

  it('applies no parallax transform to the image under reduced motion', () => {
    render(<PageHeader title="Services" description="What we build." image="/a.webp" />)
    expect(screen.getByTestId('header-image').parentElement!.style.transform).toBe('')
  })
})
