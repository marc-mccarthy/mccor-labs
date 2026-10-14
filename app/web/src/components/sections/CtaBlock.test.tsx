import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CtaBlock } from './CtaBlock'
import { site } from '@/content/site'
import { ui } from '@/content/ui'

const mocked = vi.hoisted(() => ({
  env: {
    siteUrl: 'https://mccorlabs.com',
    bookingUrl: null as string | null,
    contactEndpoint: null as string | null,
  },
}))

vi.mock('@/lib/env', () => mocked)
vi.mock('@/components/effects/StagScene', () => ({
  StagScene: (props: {
    className?: string
    fallback: ReactNode
    instanceId?: string
    layout?: string
    assembleOn?: string
    exitTarget?: unknown
  }) => (
    <div
      data-testid="cta-stag-scene"
      data-stag-instance={props.instanceId}
      data-layout={props.layout}
      data-assemble-on={props.assembleOn}
      data-has-exit={props.exitTarget === undefined ? 'false' : 'true'}
      data-scene-status="idle"
      className={props.className}
    >
      {props.fallback}
    </div>
  ),
}))

const BOOKING_URL = 'https://calendar.example.com/mccor-labs'

describe('CtaBlock', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    mocked.env.bookingUrl = null
  })

  it('renders the booking call to action when a booking url is set', () => {
    mocked.env.bookingUrl = BOOKING_URL
    render(<CtaBlock />)
    expect(screen.getByRole('link', { name: ui.bookCall })).toHaveAttribute(
      'href',
      BOOKING_URL,
    )
  })

  it('renders the mailto fallback when the booking url is null', () => {
    render(<CtaBlock />)
    expect(screen.getByRole('link', { name: ui.contactFallback })).toHaveAttribute(
      'href',
      `mailto:${site.contactEmail}`,
    )
  })

  it.each([null, BOOKING_URL])(
    'always offers a working contact route (booking: %s)',
    (url) => {
      mocked.env.bookingUrl = url
      render(<CtaBlock />)
      const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'))
      expect(hrefs.length).toBeGreaterThan(0)
      for (const href of hrefs) {
        expect(href).toMatch(/^(https:\/\/|mailto:)/)
      }
    },
  )

  it('renders exactly one section with a heading', () => {
    const { container } = render(<CtaBlock />)
    expect(container.querySelectorAll('section')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: ui.ctaHeading })).toBeInTheDocument()
  })

  it('renders the numbered eyebrow and keeps the h2 name', () => {
    render(<CtaBlock />)
    expect(screen.getByText(ui.eyebrows.contact)).toBeInTheDocument()
    expect(screen.getByText('05')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: ui.ctaHeading })).toBeVisible()
  })

  it('puts a decorative, lazily loaded image behind the card', () => {
    render(<CtaBlock />)
    const image = screen.getByTestId('cta-image')
    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('loading', 'lazy')
  })

  it('adds a decorative, lazily loaded striding stag', () => {
    render(<CtaBlock />)
    const stag = screen.getByTestId('cta-stag')
    expect(stag).toHaveAttribute('src', '/media/brand/mccor-stag-stride.webp')
    expect(stag).toHaveAttribute('alt', '')
    expect(stag).toHaveAttribute('loading', 'lazy')
  })

  it('renders its heading through SectionHeading', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    render(<CtaBlock />)
    const heading = screen.getByRole('heading', { level: 2, name: ui.ctaHeading })
    expect(heading.parentElement).toHaveAttribute('data-reveal')
    expect(heading.parentElement?.parentElement?.closest('[data-reveal]')).toBeNull()
  })

  it('adds a pointer spotlight to the panel when pointer effects are enabled', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(hover: hover) and (pointer: fine)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    const { container } = render(<CtaBlock />)
    const glow = container.querySelector('[data-spotlight]')
    expect(glow).not.toBeNull()
    expect(glow?.parentElement).toHaveClass('group', 'relative', 'isolate')
  })

  it('omits the spotlight under reduced motion', () => {
    const { container } = render(<CtaBlock />)
    expect(container.querySelector('[data-spotlight]')).toBeNull()
  })

  it('marks the top edge light decorative', () => {
    const { container } = render(<CtaBlock />)
    const edge = container.querySelector('[data-cta-edge]')
    expect(edge).toHaveAttribute('aria-hidden', 'true')
    expect(edge).toHaveAttribute('data-signal-sweep')
  })

  it('keeps the stag attributes and wires its hover and drift hooks', () => {
    const { container } = render(<CtaBlock />)
    const stag = screen.getByTestId('cta-stag')
    expect(stag).toHaveAttribute('width', '585')
    expect(stag).toHaveAttribute('height', '748')
    expect(stag).toHaveAttribute('decoding', 'async')
    expect(stag).toHaveAttribute('data-cta-stag')
    expect(stag.closest('.group\\/cta')).not.toBeNull()
    expect(container.querySelectorAll('[data-cta-stag]')).toHaveLength(1)
  })

  it('keeps the webp as the scene fallback in an aria-hidden xl-only slot under reduced motion', () => {
    render(<CtaBlock />)
    const stag = screen.getByTestId('cta-stag')
    expect(stag.closest('[data-scene-status]')).toHaveAttribute(
      'data-scene-status',
      'fallback',
    )
    const slot = stag.closest('[aria-hidden="true"]')
    expect(slot).toHaveClass('hidden', 'xl:block', 'absolute', 'bottom-0')
    expect(slot?.parentElement).toHaveClass('group/cta')
    expect(screen.queryByTestId('cta-stag-scene')).toBeNull()
  })

  it('mounts a centred cta stag scene that assembles on view with the webp fallback', async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    render(<CtaBlock />)
    const scene = await screen.findByTestId('cta-stag-scene')
    expect(scene).toHaveAttribute('data-stag-instance', 'cta')
    expect(scene).toHaveAttribute('data-layout', 'centred')
    expect(scene).toHaveAttribute('data-assemble-on', 'view')
    expect(scene).toHaveAttribute('data-has-exit', 'false')
    expect(scene.parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(scene.parentElement).toHaveClass('hidden', 'xl:block')
    expect(scene).toContainElement(screen.getByTestId('cta-stag'))
  })
})
