import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ContactPanel } from './ContactPanel'
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

function renderPanel(endpoint: string | null) {
  render(
    <ContactPanel endpoint={endpoint}>
      <p>child</p>
    </ContactPanel>,
  )
  return screen.getByRole('complementary')
}

describe('ContactPanel', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    mocked.env.bookingUrl = null
  })

  it('puts the form before the aside in source order', () => {
    const aside = renderPanel('/api/contact')
    expect(screen.getByText('child').compareDocumentPosition(aside)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('live with a booking URL lists the email, a copy button and the booking link', () => {
    mocked.env.bookingUrl = BOOKING_URL
    const aside = renderPanel('/api/contact')
    expect(
      within(aside).getByRole('heading', { name: ui.contactAsideHeading }),
    ).toBeInTheDocument()
    const mail = within(aside)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('mailto:'))
    expect(mail).toHaveLength(1)
    expect(mail[0]).toHaveAttribute('href', `mailto:${site.contactEmail}`)
    expect(
      within(aside).getByRole('button', { name: ui.contactCopyEmail }),
    ).toBeInTheDocument()
    expect(within(aside).getByRole('link', { name: ui.bookCall })).toHaveAttribute(
      'href',
      BOOKING_URL,
    )
  })

  it('live without a booking URL has no booking row and one mailto link', () => {
    const aside = renderPanel('/api/contact')
    expect(within(aside).queryByText(ui.contactAsideBook)).not.toBeInTheDocument()
    expect(within(aside).queryByRole('link', { name: ui.bookCall })).toBeNull()
    expect(within(aside).queryByRole('link', { name: ui.contactFallback })).toBeNull()
    expect(within(aside).getAllByRole('link')).toHaveLength(1)
  })

  it.each([null, BOOKING_URL])(
    'fallback with booking %s shows no email and no booking row',
    (bookingUrl) => {
      mocked.env.bookingUrl = bookingUrl
      const aside = renderPanel(null)
      expect(within(aside).queryAllByRole('link')).toHaveLength(0)
      expect(within(aside).queryByRole('button')).toBeNull()
      expect(within(aside).queryByText(site.contactEmail)).toBeNull()
      expect(within(aside).getByText(ui.contactAsideFallback)).toBeInTheDocument()
    },
  )
})
