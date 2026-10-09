import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadEnv(values: Record<string, string | undefined>) {
  vi.resetModules()
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) Reflect.deleteProperty(process.env, key)
    else process.env[key] = value
  }
  return (await import('./env')).env
}

const mutableEnv = process.env as Record<string, string | undefined>

afterEach(() => {
  delete mutableEnv.NEXT_PUBLIC_SITE_URL
  delete mutableEnv.NEXT_PUBLIC_CONTACT_ENDPOINT
  delete mutableEnv.NEXT_PUBLIC_BOOKING_URL
  mutableEnv.NODE_ENV = 'test'
})

describe('env', () => {
  it('defaults the site url to production', async () => {
    const env = await loadEnv({ NEXT_PUBLIC_SITE_URL: undefined })
    expect(env.siteUrl).toBe('https://mccorlabs.com')
  })

  it('accepts an override for preview environments', async () => {
    const env = await loadEnv({ NEXT_PUBLIC_SITE_URL: 'https://mm.mccorlabs.com' })
    expect(env.siteUrl).toBe('https://mm.mccorlabs.com')
  })

  it('rejects a malformed site url at build time', async () => {
    await expect(loadEnv({ NEXT_PUBLIC_SITE_URL: 'not-a-url' })).rejects.toThrow(
      /NEXT_PUBLIC_SITE_URL/,
    )
  })

  it('treats a missing contact endpoint as null rather than failing', async () => {
    const env = await loadEnv({ NEXT_PUBLIC_CONTACT_ENDPOINT: undefined })
    expect(env.contactEndpoint).toBeNull()
  })

  it('accepts a root-relative contact endpoint', async () => {
    const env = await loadEnv({ NEXT_PUBLIC_CONTACT_ENDPOINT: '/api/contact' })
    expect(env.contactEndpoint).toBe('/api/contact')
  })

  it('rejects a protocol-relative contact endpoint', async () => {
    await expect(
      loadEnv({ NEXT_PUBLIC_CONTACT_ENDPOINT: '//evil.example/x' }),
    ).rejects.toThrow(/NEXT_PUBLIC_CONTACT_ENDPOINT/)
  })

  it('rejects a bare relative contact endpoint', async () => {
    await expect(
      loadEnv({ NEXT_PUBLIC_CONTACT_ENDPOINT: 'api/contact' }),
    ).rejects.toThrow(/NEXT_PUBLIC_CONTACT_ENDPOINT/)
  })

  it('allows a missing booking url in development so dev works without 1Password', async () => {
    const env = await loadEnv({
      NEXT_PUBLIC_BOOKING_URL: undefined,
      NODE_ENV: 'development',
    })
    expect(env.bookingUrl).toBeNull()
  })

  it('fails a production build when the booking url is missing', async () => {
    await expect(
      loadEnv({ NEXT_PUBLIC_BOOKING_URL: undefined, NODE_ENV: 'production' }),
    ).rejects.toThrow(/NEXT_PUBLIC_BOOKING_URL is required/)
  })

  it('accepts a google calendar appointment schedule url', async () => {
    const env = await loadEnv({
      NEXT_PUBLIC_BOOKING_URL: 'https://calendar.app.google/EXAMPLE',
    })
    expect(env.bookingUrl).toBe('https://calendar.app.google/EXAMPLE')
  })

  it('strips a trailing slash from the site url so joins do not double up', async () => {
    const env = await loadEnv({ NEXT_PUBLIC_SITE_URL: 'https://mccorlabs.com/' })
    expect(env.siteUrl).toBe('https://mccorlabs.com')
  })
})
