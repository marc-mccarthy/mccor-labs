import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Footer } from './Footer'
import { Header } from './Header'
import { SkipLink } from './SkipLink'
import { footerNav, nav } from '@/content/nav'
import { site } from '@/content/site'
import { ui } from '@/content/ui'
import { env } from '@/lib/env'

describe('Header', () => {
  it('renders every primary nav destination', () => {
    render(<Header />)
    for (const item of nav) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute(
        'href',
        item.href,
      )
    }
  })

  it('offers a working call to action whether or not booking is configured', () => {
    render(<Header />)
    if (env.bookingUrl === null) {
      const cta = screen.getByRole('link', { name: ui.contactFallback })
      expect(cta).toHaveAttribute('href', `mailto:${site.contactEmail}`)
    } else {
      const cta = screen.getByRole('link', { name: ui.bookCall })
      expect(cta).toHaveAttribute('href', env.bookingUrl)
      expect(cta).toHaveAttribute('rel', expect.stringContaining('noopener'))
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
