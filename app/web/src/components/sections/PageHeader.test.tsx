import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
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
    expect(screen.getByText('What we build.')).toHaveClass('motion-safe:animate-lede')
    expect(screen.getByRole('heading', { level: 1 }).className).not.toContain('animate')
    expect(screen.getByTestId('header-image').className).not.toContain('animate')
    unmount()
    render(<PageHeader title="Careers" description="Join us." />)
    expect(screen.queryByTestId('header-signal')).not.toBeInTheDocument()
    expect(screen.getByText('Join us.').className).not.toContain('animate')
  })

  it('renders byte-identical markup for default props', () => {
    expect(renderToString(<PageHeader title="Careers" description="Join us." />)).toBe(
      '<section class="py-16 sm:py-24"><div class="mx-auto w-full max-w-6xl px-4 sm:px-6 relative"><h1 class="text-display-md leading-tight font-semibold text-text">Careers</h1><p class="mt-4 max-w-2xl text-lg text-muted">Join us.</p></div></section>',
    )
    expect(
      renderToString(
        <PageHeader title="Services" description="What we build." image="/a.webp" />,
      ),
    ).toBe(
      '<link rel="preload" as="image" href="/a.webp" fetchPriority="high"/><section class="py-16 sm:py-24 relative flex min-h-[60vh] items-end overflow-hidden pb-0 sm:pb-0"><div class="absolute inset-0 mask-t-from-80% mask-b-from-45% *:h-full"><div style="transform:none"><img src="/a.webp" alt="" fetchPriority="high" decoding="async" data-testid="header-image" class="h-full w-full object-cover object-right"/></div></div><div class="absolute inset-0 bg-linear-to-t from-base via-base/80 to-transparent sm:bg-linear-to-r sm:via-base/70"></div><div class="mx-auto w-full max-w-6xl px-4 sm:px-6 relative"><h1 class="text-display-md leading-tight font-semibold text-text">Services</h1><p class="mt-4 max-w-2xl text-lg text-muted motion-safe:animate-lede">What we build.</p></div><span aria-hidden="true" data-testid="header-signal" class="pointer-events-none absolute inset-x-0 bottom-0 hidden h-px origin-left bg-brand motion-safe:block motion-safe:animate-[band-signal_var(--duration-scene)_var(--ease-standard)_both]"></span></section>',
    )
  })

  it('applies the lg scale to the h1 and a full-opacity lede', () => {
    render(<PageHeader title="Contact" description="Talk to us." size="lg" />)
    const h1 = screen.getByRole('heading', { level: 1, name: 'Contact' })
    expect(h1).toHaveClass('text-display-lg')
    expect(h1).not.toHaveClass('text-display-md')
    const lede = screen.getByText('Talk to us.')
    expect(lede).toHaveClass('text-xl', 'text-text', 'max-w-[48ch]', 'text-pretty')
    expect(lede).not.toHaveClass('text-lg', 'text-muted', 'max-w-2xl')
    expect(lede.className).not.toMatch(/\/\d+/)
  })

  it('renders the eyebrow outside the h1 and keeps the h1 name as the title', () => {
    render(
      <PageHeader
        title="Contact"
        description="Talk to us."
        eyebrow={{ index: '01', label: 'Contact' }}
      />,
    )
    const h1 = screen.getByRole('heading', { level: 1, name: 'Contact' })
    expect(h1.textContent).toBe('Contact')
    expect(h1.contains(screen.getByText('01'))).toBe(false)
    expect(screen.getByTestId('eyebrow-tick')).toBeInTheDocument()
    expect(
      screen.getByText('01').compareDocumentPosition(h1) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('renders no eyebrow by default', () => {
    render(<PageHeader title="Careers" description="Join us." />)
    expect(screen.queryByTestId('eyebrow-tick')).not.toBeInTheDocument()
  })

  it('merges imageClassName onto the image', () => {
    render(
      <PageHeader
        title="Services"
        description="What we build."
        image="/a.webp"
        imageClassName="object-center"
      />,
    )
    const image = screen.getByTestId('header-image')
    expect(image).toHaveClass('object-center', 'h-full', 'w-full', 'object-cover')
    expect(image).not.toHaveClass('object-right')
  })
})
