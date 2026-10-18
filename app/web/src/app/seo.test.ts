import { describe, expect, it } from 'vitest'
import type { Metadata } from 'next'

import { metadata as layoutMetadata } from './layout'
import robots from './robots'
import sitemap from './sitemap'
import { footerNav, unlistedPages } from '@/content/nav'
import { env } from '@/lib/env'

describe('sitemap', () => {
  it('lists the home route and every footer destination', () => {
    const entries = sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://mccorlabs.com/')
    for (const item of footerNav) {
      expect(urls).toContain(`https://mccorlabs.com${item.href}`)
    }
  })

  it('lists the lab', () => {
    expect(sitemap().map((e) => e.url)).toContain(
      'https://mccorlabs.com/lab/should-this-be-ai/',
    )
  })

  it('lists every unlisted lab page', () => {
    const urls = sitemap().map((e) => e.url)
    expect(urls).toContain('https://mccorlabs.com/lab/evals/')
    for (const path of unlistedPages) {
      expect(urls).toContain(`https://mccorlabs.com${path}`)
    }
  })

  it('never emits a duplicate url', () => {
    const urls = sitemap().map((e) => e.url)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('omits /work from the sitemap', () => {
    expect(sitemap().map((e) => e.url)).not.toContain('https://mccorlabs.com/work/')
  })
})

describe('robots', () => {
  it('allows crawling and points at the sitemap', () => {
    const result = robots()
    expect(result.sitemap).toBe('https://mccorlabs.com/sitemap.xml')
    expect(result.rules).toMatchObject({ userAgent: '*', allow: '/' })
  })
})

const pageModules: Record<string, () => Promise<{ metadata: Metadata }>> = {
  '/': () => import('./page'),
  '/about/': () => import('./about/page'),
  '/careers/': () => import('./careers/page'),
  '/contact/': () => import('./contact/page'),
  '/privacy/': () => import('./privacy/page'),
  '/process/': () => import('./process/page'),
  '/services/': () => import('./services/page'),
  '/terms/': () => import('./terms/page'),
  '/lab/evals/': () => import('./lab/evals/page'),
  '/lab/should-this-be-ai/': () => import('./lab/should-this-be-ai/page'),
}

function resolveUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('expected a string url')
  return new URL(value, env.siteUrl).href
}

describe('page metadata', () => {
  it('covers every sitemap route', () => {
    const paths = sitemap().map((e) => e.url.replace(env.siteUrl, ''))
    expect(Object.keys(pageModules).sort()).toEqual([...paths].sort())
  })

  it('sets metadataBase to the site url', () => {
    expect(layoutMetadata.metadataBase).toEqual(new URL(env.siteUrl))
  })

  it.each(Object.entries(pageModules))(
    '%s sets canonical and openGraph.url',
    async (path, load) => {
      const { metadata } = await load()
      expect(resolveUrl(metadata.alternates?.canonical)).toBe(`${env.siteUrl}${path}`)
      expect(resolveUrl(metadata.openGraph?.url)).toBe(`${env.siteUrl}${path}`)
      expect(metadata.openGraph).toMatchObject({
        siteName: 'McCor Labs',
        locale: 'en_US',
      })
    },
  )

  it('leaves /work without a canonical', async () => {
    const { metadata } = await import('./work/page')
    expect(metadata.alternates).toBeUndefined()
  })

  it('sets the en_US locale on the layout', () => {
    expect(layoutMetadata.openGraph).toMatchObject({ locale: 'en_US', type: 'website' })
  })
})
