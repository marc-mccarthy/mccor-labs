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

  it('adds an always-visible signal line, animated only under motion-safe, with an image', () => {
    const { unmount } = render(
      <PageHeader title="Services" description="What we build." image="/a.webp" />,
    )
    const signal = screen.getByTestId('header-signal')
    expect(signal).toHaveClass(
      'absolute',
      'h-px',
      'bg-brand',
      'block',
      'motion-safe:animate-[band-signal_var(--duration-scene)_var(--ease-standard)_both]',
    )
    expect(signal).not.toHaveClass('hidden', 'motion-safe:block')
    expect(signal.className).not.toMatch(/(^|\s)animate-/)
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
      '<section class="py-14 sm:py-20"><div class="mx-auto w-full max-w-6xl px-4 sm:px-6 relative"><h1 class="text-display-md leading-tight font-semibold text-text">Careers</h1><p class="mt-2 max-w-2xl text-lg text-muted">Join us.</p></div></section>',
    )
    expect(
      renderToString(
        <PageHeader title="Services" description="What we build." image="/a.webp" />,
      ),
    ).toBe(
      '<link rel="preload" as="image" href="/a.webp" fetchPriority="high"/><section class="py-14 sm:py-20 relative flex min-h-[30vh] items-end overflow-hidden pb-8 sm:pb-12 [&amp;+section]:pt-10 sm:[&amp;+section]:pt-14"><div class="absolute inset-0 mask-t-from-80% mask-b-from-45% *:h-full"><div style="transform:none"><img src="/a.webp" alt="" fetchPriority="high" decoding="async" data-testid="header-image" class="h-full w-full object-cover object-right"/></div></div><div class="absolute inset-0 bg-linear-to-t from-base via-base/80 to-transparent sm:bg-linear-to-r sm:via-base/70"></div><div class="mx-auto w-full max-w-6xl px-4 sm:px-6 relative"><h1 class="text-display-md leading-tight font-semibold text-text">Services</h1><p class="mt-2 max-w-2xl text-lg text-muted motion-safe:animate-lede">What we build.</p></div><span aria-hidden="true" data-testid="header-signal" class="pointer-events-none absolute inset-x-0 bottom-0 block h-px origin-left bg-brand motion-safe:animate-[band-signal_var(--duration-scene)_var(--ease-standard)_both]"></span></section>',
    )
  })

  it('sets every sub-page h1 on the one display-md scale with no eyebrow', () => {
    const { container } = render(
      <PageHeader title="Contact" description="Talk to us." image="/a.webp" />,
    )
    const h1 = screen.getByRole('heading', { level: 1, name: 'Contact' })
    expect(h1).toHaveClass('text-display-md')
    expect(h1).not.toHaveClass('text-display-lg')
    expect(h1.previousElementSibling).toBeNull()
    expect(screen.getByText('Talk to us.')).toHaveClass(
      'max-w-2xl',
      'text-lg',
      'text-muted',
    )
    expect(container.querySelector('[data-testid="eyebrow-tick"]')).toBeNull()
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

  it('renders the pre-slot markup byte for byte when no scene is passed', () => {
    const bare = renderToString(
      <PageHeader title="Services" description="What we build." image="/a.webp" />,
    )
    expect(
      renderToString(
        <PageHeader
          title="Services"
          description="What we build."
          image="/a.webp"
          scene={undefined}
        />,
      ),
    ).toBe(bare)
    expect(
      renderToString(
        <PageHeader
          title="Services"
          description="What we build."
          image="/a.webp"
          scene={null}
        />,
      ),
    ).toBe(bare)
    expect(bare).toContain(
      '<div style="transform:none"><img src="/a.webp" alt="" fetchPriority="high" decoding="async" data-testid="header-image" class="h-full w-full object-cover object-right"/></div>',
    )
  })

  it('stacks the scene over the image inside one parallax wrapper', () => {
    render(
      <PageHeader
        title="Contact"
        description="Talk to us."
        image="/a.webp"
        scene={<div data-testid="band-scene" />}
      />,
    )
    const image = screen.getByTestId('header-image')
    const wrapper = image.parentElement!
    expect(wrapper.tagName).toBe('DIV')
    expect(wrapper.className).toBe('relative h-full')
    expect([...wrapper.children]).toEqual([image, screen.getByTestId('band-scene')])
    expect(wrapper.parentElement!.parentElement!.className).toBe(
      'absolute inset-0 mask-t-from-80% mask-b-from-45% *:h-full',
    )
  })

  it('ignores the scene when there is no image band', () => {
    render(
      <PageHeader
        title="Careers"
        description="Join us."
        scene={<div data-testid="band-scene" />}
      />,
    )
    expect(screen.queryByTestId('band-scene')).not.toBeInTheDocument()
  })
})
