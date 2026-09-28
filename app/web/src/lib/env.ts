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

/**
 * Optional in development, mandatory in a production build. Fails the build
 * rather than allowing a silent degradation that nobody would notice.
 */
function requiredInProduction(name: string, raw: string | undefined): string | null {
  const value = optionalUrl(name, raw)
  if (value === null && process.env.NODE_ENV === 'production') {
    throw new Error(
      `${name} is required for a production build. Run the build through ` +
        '`op run --env-file=.env.template -- …` so 1Password supplies it.',
    )
  }
  return value
}

/** Public configuration, inlined at build time by the static export. */
export const env = {
  siteUrl: requireUrl(
    'NEXT_PUBLIC_SITE_URL',
    process.env.NEXT_PUBLIC_SITE_URL,
    'https://mccorlabs.com',
  ),
  /**
   * Booking destination — a Google Calendar appointment schedule or Cal.com URL.
   * Required for a production build: without it the primary CTA silently falls
   * back to email, which would ship a site with no booking link and nothing to
   * catch it. Optional in development so `pnpm dev` works without 1Password.
   */
  bookingUrl: requiredInProduction(
    'NEXT_PUBLIC_BOOKING_URL',
    process.env.NEXT_PUBLIC_BOOKING_URL,
  ),
  /** null means no endpoint is provisioned yet; the form degrades to email. */
  contactEndpoint: optionalUrl(
    'NEXT_PUBLIC_CONTACT_ENDPOINT',
    process.env.NEXT_PUBLIC_CONTACT_ENDPOINT,
  ),
} as const
