import type { MetadataRoute } from 'next'

import { footerNav, unlistedPages } from '@/content/nav'
import { env } from '@/lib/env'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const paths = ['/', ...footerNav.map((item) => item.href), ...unlistedPages]
  const unique = [...new Set(paths)]

  return unique.map((path) => ({
    url: `${env.siteUrl}${path}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }))
}
