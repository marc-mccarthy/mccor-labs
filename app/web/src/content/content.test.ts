import { describe, expect, it } from 'vitest'
import { site } from './site'
import { footerNav, nav } from './nav'
import { ui } from './ui'

describe('site content', () => {
  it('has a name and tagline', () => {
    expect(site.name).toBe('McCor Labs')
    expect(site.tagline).toContain('websites, applications and AI features')
  })

  it('has a contact mailbox on the firm domain', () => {
    expect(site.contactEmail).toMatch(/@mccorlabs\.com$/)
  })

  it('offers budget options for the contact form', () => {
    expect(site.budgetOptions.length).toBeGreaterThanOrEqual(3)
    expect(new Set(site.budgetOptions).size).toBe(site.budgetOptions.length)
  })
})

describe('navigation', () => {
  it('links only to internal routes with trailing slashes', () => {
    for (const item of [...nav, ...footerNav]) {
      expect(item.href, `${item.label} must be a rooted path`).toMatch(/^\/$|^\/.+\/$/)
      expect(item.label.length).toBeGreaterThan(0)
    }
  })

  it('has no duplicate destinations in the main nav', () => {
    const hrefs = nav.map((n) => n.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})

describe('ui strings', () => {
  it('provides every accessible name a component needs', () => {
    for (const key of ['skipToContent', 'openMenu', 'closeMenu', 'bookCall'] as const) {
      expect(ui[key], `ui.${key} is missing`).toBeTruthy()
    }
  })
})
