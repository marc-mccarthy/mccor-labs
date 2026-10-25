import { describe, expect, it } from 'vitest'

import { openGraphBase, organizationJsonLd, pageSeo, serializeJsonLd } from './seo'
import { env } from '@/lib/env'
import { site } from '@/content/site'

describe('pageSeo', () => {
  it('sets canonical and openGraph.url to the path', () => {
    const seo = pageSeo('/about/')
    expect(seo.alternates?.canonical).toBe('/about/')
    expect(seo.openGraph).toMatchObject({ ...openGraphBase, url: '/about/' })
  })
})

describe('openGraphBase', () => {
  it('carries the shared share image with its alt text', () => {
    expect(openGraphBase.images).toEqual([
      expect.objectContaining({
        url: '/opengraph-image.jpg',
        alt: expect.stringContaining('Red Stag'),
      }),
    ])
  })
})

describe('organizationJsonLd', () => {
  it('uses only facts from site and env', () => {
    expect(organizationJsonLd()).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: site.name,
      url: env.siteUrl,
      slogan: site.slogan,
      description: site.tagline,
      email: site.contactEmail,
    })
  })
})

describe('serializeJsonLd', () => {
  it('escapes < so the payload cannot close the script tag', () => {
    const out = serializeJsonLd({ name: '</script><b>' })
    expect(out).not.toContain('<')
    expect(JSON.parse(out)).toEqual({ name: '</script><b>' })
  })
})
