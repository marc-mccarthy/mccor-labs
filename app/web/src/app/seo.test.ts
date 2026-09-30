import { describe, expect, it } from 'vitest'
import robots from './robots'
import sitemap from './sitemap'
import { footerNav } from '@/content/nav'

describe('sitemap', () => {
  it('lists the home route and every footer destination', () => {
    const entries = sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://mccorlabs.com/')
    for (const item of footerNav) {
      expect(urls).toContain(`https://mccorlabs.com${item.href}`)
    }
  })

  it('never emits a duplicate url', () => {
    const urls = sitemap().map((e) => e.url)
    expect(new Set(urls).size).toBe(urls.length)
  })
})

describe('robots', () => {
  it('allows crawling and points at the sitemap', () => {
    const result = robots()
    expect(result.sitemap).toBe('https://mccorlabs.com/sitemap.xml')
    expect(result.rules).toMatchObject({ userAgent: '*', allow: '/' })
  })
})
