import { describe, expect, it } from 'vitest'
import { site } from './site'
import { footerNav, nav } from './nav'
import { ui } from './ui'
import { services } from './services'

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

  it('does not advertise /work in either nav', () => {
    expect([...nav, ...footerNav].map((n) => n.href)).not.toContain('/work/')
  })
})

describe('ui strings', () => {
  it('provides every accessible name a component needs', () => {
    for (const key of ['skipToContent', 'openMenu', 'closeMenu', 'bookCall'] as const) {
      expect(ui[key], `ui.${key} is missing`).toBeTruthy()
    }
  })
})

describe('services content', () => {
  it('offers five services in the order the spec fixes', () => {
    expect(services.map((s) => s.slug)).toEqual([
      'websites',
      'applications',
      'ai-engineering',
      'consulting',
      'teaching',
    ])
  })

  it('gives every service a one-line outcome', () => {
    for (const service of services) {
      expect(service.outcome.length, `${service.slug} outcome is empty`).toBeGreaterThan(
        0,
      )
      expect(service.outcome.length, `${service.slug} outcome is too long`).toBeLessThan(
        120,
      )
    }
  })

  it('gives ai-engineering five capabilities', () => {
    const aiEngineering = services.find((s) => s.slug === 'ai-engineering')
    expect(aiEngineering?.capabilities?.map((c) => c.slug)).toEqual([
      'ai-integration',
      'workflow-automation',
      'retrieval-pipelines',
      'mcp-servers',
      'evaluation',
    ])
  })

  it('claims no delivered work beyond the two the owner supplied', () => {
    const prose = services.map((s) => s.detail).join(' ')
    expect(prose).not.toMatch(/hallucination-free|100% accurate|guaranteed/i)
  })
})
