import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EXPIRES_IN_DAYS, GET } from './route'
import { site } from '@/content/site'
import { env } from '@/lib/env'

describe('security.txt', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is plain text', () => {
    expect(GET().headers.get('content-type')).toBe('text/plain; charset=utf-8')
  })

  it('emits the RFC 9116 fields in order with LF endings and a trailing newline', async () => {
    const body = await GET().text()
    expect(body).toBe(
      [
        `Contact: mailto:${site.contactEmail}`,
        'Expires: 2026-06-30T12:00:00Z',
        `Canonical: ${env.siteUrl}/.well-known/security.txt`,
        'Preferred-Languages: en',
        '',
      ].join('\n'),
    )
    expect(body).not.toContain('\r')
  })

  it('expires within a year of build time', () => {
    expect(EXPIRES_IN_DAYS).toBeLessThan(365)
  })
})
