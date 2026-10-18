import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Metadata } from 'next'

import { site } from '@/content/site'
import { env } from '@/lib/env'

type OpenGraph = NonNullable<Metadata['openGraph']>

const OG_IMAGE_ALT = readFileSync(
  join(process.cwd(), 'src', 'app', 'opengraph-image.alt.txt'),
  'utf8',
).trim()

export const openGraphBase: OpenGraph = {
  siteName: site.name,
  type: 'website',
  locale: 'en_US',
  images: [{ url: '/opengraph-image.jpg', width: 1200, height: 630, alt: OG_IMAGE_ALT }],
}

export function pageSeo(path: string): Pick<Metadata, 'alternates' | 'openGraph'> {
  return {
    alternates: { canonical: path },
    openGraph: { ...openGraphBase, url: path },
  }
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: env.siteUrl,
    slogan: site.slogan,
    description: site.tagline,
    email: site.contactEmail,
  }
}

export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
