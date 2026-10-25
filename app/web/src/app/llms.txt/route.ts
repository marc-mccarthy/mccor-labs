import type { Metadata } from 'next'

import { metadata as about } from '@/app/about/page'
import { metadata as careers } from '@/app/careers/page'
import { metadata as contact } from '@/app/contact/page'
import { metadata as lab } from '@/app/lab/should-this-be-ai/page'
import { metadata as privacy } from '@/app/privacy/page'
import { metadata as process } from '@/app/process/page'
import { metadata as services } from '@/app/services/page'
import { metadata as terms } from '@/app/terms/page'
import { footerNav } from '@/content/nav'
import { site } from '@/content/site'
import { env } from '@/lib/env'

export const dynamic = 'force-static'

const pageMetadata: Record<string, Metadata> = {
  '/services/': services,
  '/process/': process,
  '/about/': about,
  '/contact/': contact,
  '/lab/should-this-be-ai/': lab,
  '/careers/': careers,
  '/privacy/': privacy,
  '/terms/': terms,
}

function describe(href: string): string {
  const description = pageMetadata[href]?.description
  if (typeof description !== 'string') {
    throw new Error(`llms.txt: ${href} has no metadata description`)
  }
  return description
}

export function GET(): Response {
  const links = [
    `- [Home](${env.siteUrl}/): ${site.slogan}`,
    ...footerNav.map(
      (item) => `- [${item.label}](${env.siteUrl}${item.href}): ${describe(item.href)}`,
    ),
  ]

  const body = [`# ${site.name}`, '', `> ${site.tagline}`, '', ...links, ''].join('\n')

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
