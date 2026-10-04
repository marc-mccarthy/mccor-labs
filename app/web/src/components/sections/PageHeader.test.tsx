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

  it('adds the signal line and lede animation only with an image', () => {
    const { unmount } = render(
      <PageHeader title="Services" description="What we build." image="/a.webp" />,
    )
    const signal = screen.getByTestId('header-signal')
    expect(signal).toHaveClass(
      'absolute',
      'h-px',
      'bg-brand',
      'hidden',
      'motion-safe:block',
      'motion-safe:animate-[band-signal_var(--duration-scene)_var(--ease-standard)_both]',
    )
    expect(signal).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('What we build.').className).toContain(
      'motion-safe:animate-[band-lede',
    )
    expect(screen.getByRole('heading', { level: 1 }).className).not.toContain('animate')
    expect(screen.getByTestId('header-image').className).not.toContain('animate')
    unmount()
    render(<PageHeader title="Careers" description="Join us." />)
    expect(screen.queryByTestId('header-signal')).not.toBeInTheDocument()
    expect(screen.getByText('Join us.').className).not.toContain('animate')
  })
})
