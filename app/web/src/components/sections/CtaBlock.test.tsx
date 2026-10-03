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
})
