import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Footer } from './Footer'
import { Header } from './Header'
import { SkipLink } from './SkipLink'
import { footerNav, nav } from '@/content/nav'
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

describe('Header', () => {
  beforeEach(() => {
    mocked.env.bookingUrl = null
  })

  it('renders every primary nav destination', () => {
    render(<Header />)
    for (const item of nav) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute(
        'href',
        item.href,
      )
    }
  })

  it('falls back to an email link when booking is not configured', () => {
    mocked.env.bookingUrl = null
    render(<Header />)
    const cta = screen.getByRole('link', { name: ui.contactFallback })
    expect(cta).toHaveAttribute('href', `mailto:${site.contactEmail}`)
  })

  it('links to the booking url in a new tab when booking is configured', () => {
    mocked.env.bookingUrl = BOOKING_URL
    render(<Header />)
    const cta = screen.getByRole('link', { name: ui.bookCall })
    expect(cta).toHaveAttribute('href', BOOKING_URL)
    expect(cta).toHaveAttribute('target', '_blank')
    expect(cta).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(cta).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
  })

  it('exposes a menu toggle with an accessible name', () => {
    render(<Header />)
    expect(screen.getByRole('button', { name: ui.openMenu })).toBeInTheDocument()
  })

  it('reflects open state in aria-expanded', async () => {
    render(<Header />)
    const toggle = screen.getByRole('button', { name: ui.openMenu })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('closes on Escape and returns focus to the toggle', async () => {
    render(<Header />)
    const toggle = screen.getByRole('button', { name: ui.openMenu })
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard('{Escape}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
  })

  it('renders every nav destination when open', async () => {
    render(<Header />)
    await userEvent.click(screen.getByRole('button', { name: ui.openMenu }))
    for (const item of nav) {
      expect(screen.getAllByRole('link', { name: item.label }).length).toBeGreaterThan(0)
    }
  })
})

describe('Footer', () => {
  it('renders every footer destination including legal routes', () => {
    render(<Footer />)
    for (const item of footerNav) {
      expect(screen.getAllByRole('link', { name: item.label }).length).toBeGreaterThan(0)
    }
  })
})

describe('SkipLink', () => {
  it('targets the main landmark', () => {
    render(<SkipLink />)
    expect(screen.getByRole('link', { name: ui.skipToContent })).toHaveAttribute(
      'href',
      '#main',
    )
  })
})
