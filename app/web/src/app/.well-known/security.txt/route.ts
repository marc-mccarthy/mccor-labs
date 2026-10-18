import { site } from '@/content/site'
import { env } from '@/lib/env'

export const dynamic = 'force-static'

export const EXPIRES_IN_DAYS = 180

const DAY_MS = 24 * 60 * 60 * 1000

export function GET(): Response {
  const expires = new Date(Date.now() + EXPIRES_IN_DAYS * DAY_MS)
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')

  const body = [
    `Contact: mailto:${site.contactEmail}`,
    `Expires: ${expires}`,
    `Canonical: ${env.siteUrl}/.well-known/security.txt`,
    'Preferred-Languages: en',
    '',
  ].join('\n')

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
