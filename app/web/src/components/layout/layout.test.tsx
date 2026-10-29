import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookingCta } from './BookingCta'
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

const navigation = vi.hoisted(() => ({ pathname: '/' }))

vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }))

const BOOKING_URL = 'https://calendar.example.com/mccor-labs'

beforeEach(() => {
  Object.defineProperty(navigator, 'userActivation', {
    value: { isActive: false },
    configurable: true,
  })
})

afterEach(() => {
  Reflect.deleteProperty(navigator, 'userActivation')
})

describe('Header', () => {
  beforeEach(() => {
    mocked.env.bookingUrl = null
    navigation.pathname = '/'
  })

  it.each(nav.flatMap((item) => [item.href, item.href.replace(/\/$/, '')]))(
    'marks only the matching nav link current at %s',
    (pathname) => {
      navigation.pathname = pathname
      render(<Header />)
      const current = nav.find(
        (item) => item.href.replace(/\/$/, '') === pathname.replace(/\/$/, ''),
      )
      const marked = screen
        .getAllByRole('link')
        .filter((link) => link.getAttribute('aria-current') === 'page')
      expect(marked.length).toBeGreaterThan(0)
      for (const link of marked) expect(link).toHaveAttribute('href', current?.href)
    },
  )

  it('marks no nav link current on the home route', () => {
    render(<Header />)
    expect(
      screen.getAllByRole('link').filter((link) => link.hasAttribute('aria-current')),
    ).toHaveLength(0)
  })

  it('draws the hover underline only when motion is allowed', () => {
    render(<Header />)
    expect(screen.getAllByRole('link', { name: 'Services' })[0]).toHaveClass(
      'motion-safe:after:transition-transform',
      'motion-safe:after:duration-(--duration-pointer)',
      'hover:after:scale-x-100',
    )
  })

  it('carries the hook the scroll-driven edge and progress line target', () => {
    const { container } = render(<Header />)
    const header = container.querySelector('header')
    expect(header).toHaveAttribute('data-site-header')
    expect(header).toHaveClass('sticky', 'top-0', 'backdrop-blur')
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

  it.each(['/', '/services/', '/contact/'])(
    'leaves the booking call to the page at %s',
    (pathname) => {
      mocked.env.bookingUrl = BOOKING_URL
      navigation.pathname = pathname
      render(<Header />)
      expect(screen.queryByRole('link', { name: ui.bookCall })).toBeNull()
      expect(screen.queryByRole('link', { name: ui.contactFallback })).toBeNull()
    },
  )

  it('links to the booking url in a new tab on pages without their own', () => {
    mocked.env.bookingUrl = BOOKING_URL
    navigation.pathname = '/work/'
    render(<Header />)
    const cta = screen.getByRole('link', { name: ui.bookCall })
    expect(cta).toHaveAttribute('href', BOOKING_URL)
    expect(cta).toHaveAttribute('target', '_blank')
    expect(cta).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(cta).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
    expect(cta.closest('[data-magnetic]')).not.toBeNull()
  })

  it('falls back to an email link in the header when booking is not configured', () => {
    mocked.env.bookingUrl = null
    navigation.pathname = '/process/'
    render(<Header />)
    const cta = screen.getByRole('link', { name: ui.contactFallback })
    expect(cta).toHaveAttribute('href', `mailto:${site.contactEmail}`)
  })

  it('offers the music and motion toggles right before the menu button at every width', () => {
    render(<Header />)
    const music = screen.getByRole('button', { name: ui.muteMusic })
    const pause = screen.getByRole('button', { name: ui.pauseMotion })
    const menu = screen.getByRole('button', { name: ui.openMenu })
    expect(music).toHaveAttribute('aria-pressed', 'false')
    expect(pause).toHaveAttribute('aria-pressed', 'false')
    expect(music.nextElementSibling).toBe(pause)
    expect(pause.nextElementSibling).toBe(menu)
    expect(music.closest('.hidden')).toBeNull()
    expect(pause.closest('.hidden')).toBeNull()
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

describe('Header mobile menu', () => {
  beforeEach(() => {
    mocked.env.bookingUrl = null
    navigation.pathname = '/'
  })

  function menu() {
    return document.getElementById('mobile-nav')!
  }

  it('flips the hidden attribute with the toggle', async () => {
    render(<Header />)
    expect(menu()).toHaveAttribute('hidden')
    await userEvent.click(screen.getByRole('button', { name: ui.openMenu }))
    expect(menu()).not.toHaveAttribute('hidden')
    await userEvent.click(screen.getByRole('button', { name: ui.closeMenu }))
    expect(menu()).toHaveAttribute('hidden')
  })

  it('gives every menu link a 44px target', () => {
    render(<Header />)
    const links = within(menu()).getAllByRole('link', { hidden: true })
    for (const item of nav) {
      const link = links.find((el) => el.textContent === item.label)
      expect(link).toHaveClass('min-h-11')
    }
  })

  it('offers the booking call in the open menu', async () => {
    mocked.env.bookingUrl = BOOKING_URL
    render(<Header />)
    await userEvent.click(screen.getByRole('button', { name: ui.openMenu }))
    expect(within(menu()).getByRole('link', { name: ui.bookCall })).toHaveAttribute(
      'href',
      BOOKING_URL,
    )
  })

  it('closes the menu when the booking call is activated', async () => {
    mocked.env.bookingUrl = BOOKING_URL
    render(<Header />)
    await userEvent.click(screen.getByRole('button', { name: ui.openMenu }))
    await userEvent.click(within(menu()).getByRole('link', { name: ui.bookCall }))
    expect(menu()).toHaveAttribute('hidden')
  })

  it('staggers items and gates the animation behind motion-safe', () => {
    render(<Header />)
    const items = Array.from(menu().querySelectorAll<HTMLElement>('[style*="--i"]'))
    expect(items.map((el) => el.style.getPropertyValue('--i'))).toEqual(
      Array.from({ length: nav.length + 1 }, (_, i) => String(i)),
    )
    expect(menu()).toHaveClass(
      'motion-safe:transition-discrete',
      'motion-safe:starting:opacity-0',
    )
    expect(items[0]).toHaveClass(
      'motion-safe:delay-[calc(var(--i)*var(--stagger-interval))]',
    )
  })

  it('gives the menu button and every menu link press feedback', () => {
    render(<Header />)
    expect(screen.getByRole('button', { name: ui.openMenu })).toHaveClass('press')
    const links = within(menu()).getAllByRole('link', { hidden: true })
    for (const item of nav) {
      expect(links.find((el) => el.textContent === item.label)).toHaveClass('press')
    }
  })

  it('draws the menu icon as three lines that only transition when motion is allowed', () => {
    render(<Header />)
    const toggle = screen.getByRole('button', { name: ui.openMenu })
    const lines = toggle.querySelectorAll('line')
    expect(lines).toHaveLength(3)
    for (const line of lines) {
      expect(line).toHaveClass('motion-safe:transition-[translate,rotate,opacity]')
    }
  })
})

describe('BookingCta link variant', () => {
  beforeEach(() => {
    mocked.env.bookingUrl = null
    navigation.pathname = '/'
  })

  it('renders no magnetic wrapper and keeps the mailto link when booking is null', () => {
    const { container } = render(<BookingCta variant="link" />)
    expect(container.querySelector('[data-magnetic]')).toBeNull()
    expect(screen.getByRole('link', { name: ui.contactFallback })).toHaveAttribute(
      'href',
      `mailto:${site.contactEmail}`,
    )
  })

  it('renders no magnetic wrapper and keeps the booking link when booking is set', () => {
    mocked.env.bookingUrl = BOOKING_URL
    const { container } = render(<BookingCta variant="link" />)
    expect(container.querySelector('[data-magnetic]')).toBeNull()
    expect(screen.getByRole('link', { name: ui.bookCall })).toHaveAttribute(
      'href',
      BOOKING_URL,
    )
  })

  it('keeps the magnetic wrapper by default', () => {
    const { container } = render(<BookingCta />)
    expect(container.querySelector('[data-magnetic]')).not.toBeNull()
  })

  it('keeps the only header booking call in the mobile menu on the home page', () => {
    mocked.env.bookingUrl = BOOKING_URL
    render(<Header />)
    const links = screen.getAllByRole('link', { name: ui.bookCall, hidden: true })
    expect(links).toHaveLength(1)
    expect(links[0]?.closest('#mobile-nav')).not.toBeNull()
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

describe('Footer signal', () => {
  it('carries a decorative sweep line hidden until the scroll timeline enables it', () => {
    const { container } = render(<Footer />)
    const signal = container.querySelector('[data-footer-signal]')!
    expect(signal).toHaveAttribute('aria-hidden', 'true')
    expect(signal).toHaveClass('hidden', 'bg-brand', 'h-px')
  })

  it('gives every footer link press feedback', () => {
    render(<Footer />)
    for (const item of footerNav) {
      expect(screen.getAllByRole('link', { name: item.label })[0]).toHaveClass('press')
    }
  })

  it('gives every footer link the nav hover underline', () => {
    render(<Footer />)
    for (const item of footerNav) {
      expect(screen.getAllByRole('link', { name: item.label })[0]).toHaveClass(
        'hover:after:scale-x-100',
        'motion-safe:after:duration-(--duration-pointer)',
      )
    }
  })
})
