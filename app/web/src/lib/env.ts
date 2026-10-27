function requireUrl(name: string, raw: string | undefined, fallback: string): string {
  const value = raw ?? fallback
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${name} must be an absolute URL, received: ${value}`)
  }
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw new Error(`${name} must use https, received: ${value}`)
  }
  return value.replace(/\/+$/, '')
}

function optionalUrl(name: string, raw: string | undefined): string | null {
  if (raw === undefined || raw === '') return null
  try {
    new URL(raw)
  } catch {
    throw new Error(`${name} must be an absolute URL when set, received: ${raw}`)
  }
  return raw
}

function optionalEndpoint(name: string, raw: string | undefined): string | null {
  if (raw === undefined || raw === '') return null
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  if (raw.startsWith('//')) {
    throw new Error(`${name} must not be protocol-relative, received: ${raw}`)
  }
  return optionalUrl(name, raw)
}

function optionalMeasurementId(name: string, raw: string | undefined): string | null {
  if (raw === undefined || raw === '') return null
  if (!/^G-[A-Z0-9]{4,16}$/.test(raw)) {
    throw new Error(
      `${name} must be a GA4 measurement ID like G-XXXXXXXXXX, received: ${raw}`,
    )
  }
  return process.env.NODE_ENV === 'production' ? raw : null
}

function requiredInProduction(name: string, raw: string | undefined): string | null {
  const value = optionalUrl(name, raw)
  if (value === null && process.env.NODE_ENV === 'production') {
    throw new Error(
      `${name} is required for a production build. Run the build through ` +
        '`op run --env-file=app.env -- …` so 1Password supplies it.',
    )
  }
  return value
}

export const env = {
  siteUrl: requireUrl(
    'NEXT_PUBLIC_SITE_URL',
    process.env.NEXT_PUBLIC_SITE_URL,
    'https://mccorlabs.com',
  ),
  bookingUrl: requiredInProduction(
    'NEXT_PUBLIC_BOOKING_URL',
    process.env.NEXT_PUBLIC_BOOKING_URL,
  ),
  contactEndpoint: optionalEndpoint(
    'NEXT_PUBLIC_CONTACT_ENDPOINT',
    process.env.NEXT_PUBLIC_CONTACT_ENDPOINT,
  ),
  labLive: process.env.NEXT_PUBLIC_LAB_LIVE === '1',
  gaId: optionalMeasurementId('NEXT_PUBLIC_GA_ID', process.env.NEXT_PUBLIC_GA_ID),
} as const
