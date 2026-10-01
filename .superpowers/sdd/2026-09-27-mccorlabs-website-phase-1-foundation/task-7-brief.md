## Task 7: Typed content layer and environment parsing

**Files:**
- Create: `app/web/src/content/types.ts`, `site.ts`, `nav.ts`, `ui.ts`, `content.test.ts`
- Create: `app/web/src/lib/env.ts`, `app/web/src/lib/env.test.ts`
- Create: `app/web/.env.template`

**Interfaces:**
- Consumes: Task 2.
- Produces: `site`, `nav`, `footerNav`, `ui` exports; `Service`, `TeamMember`, `ProcessStage`, `NavItem` types; `env` with `siteUrl` and `contactEndpoint`.

- [ ] **Step 1: Write the failing content test**

Create `app/web/src/content/content.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { site } from './site'
import { footerNav, nav } from './nav'
import { ui } from './ui'

describe('site content', () => {
  it('has a name and tagline', () => {
    expect(site.name).toBe('McCor Labs')
    expect(site.tagline).toContain('websites, applications and AI features')
  })

  it('has a contact mailbox on the firm domain', () => {
    expect(site.contactEmail).toMatch(/@mccorlabs\.com$/)
  })

  it('offers budget options for the contact form', () => {
    expect(site.budgetOptions.length).toBeGreaterThanOrEqual(3)
    expect(new Set(site.budgetOptions).size).toBe(site.budgetOptions.length)
  })
})

describe('navigation', () => {
  it('links only to internal routes with trailing slashes', () => {
    for (const item of [...nav, ...footerNav]) {
      expect(item.href, `${item.label} must be a rooted path`).toMatch(/^\/$|^\/.+\/$/)
      expect(item.label.length).toBeGreaterThan(0)
    }
  })

  it('has no duplicate destinations in the main nav', () => {
    const hrefs = nav.map((n) => n.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})

describe('ui strings', () => {
  it('provides every accessible name a component needs', () => {
    for (const key of ['skipToContent', 'openMenu', 'closeMenu', 'bookCall'] as const) {
      expect(ui[key], `ui.${key} is missing`).toBeTruthy()
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm -F web exec vitest run src/content`
Expected: FAIL — cannot resolve `./site`.

- [ ] **Step 3: Create the content types**

Create `app/web/src/content/types.ts`:

```ts
export type NavItem = {
  label: string
  href: string
}

export type Service = {
  slug: string
  title: string
  summary: string
  detail: string
  deliverables: readonly string[]
}

export type TeamMember = {
  slug: string
  name: string
  role: string
  bio: string
  /** Media slot id resolved through the media manifest, or null for a
   *  non-photographic treatment. */
  mediaSlot: string | null
  links?: readonly { label: string; href: string }[]
}

export type ProcessStage = {
  index: number
  title: string
  summary: string
  duration: string
}
```

- [ ] **Step 4: Create the site content**

`contactEmail` is the admin mailbox from `infra/settings.auto.tfvars`, so it is a real value. The booking URL is no longer here — it moved to `NEXT_PUBLIC_BOOKING_URL` so a preview environment can point at a throwaway calendar. Never substitute a plausible-looking URL for a missing one anywhere: a dead primary CTA passes review unnoticed.

Create `app/web/src/content/site.ts`:

```ts
export const site = {
  name: 'McCor Labs',
  tagline:
    'A small senior team building websites, applications and AI features for companies that need them to actually work.',
  // Booking URL now lives in NEXT_PUBLIC_BOOKING_URL — see src/lib/env.ts.
  // The admin mailbox from infra/settings.auto.tfvars.
  contactEmail: 'marcm@mccorlabs.com',
  budgetOptions: [
    'Under $10k',
    '$10k – $25k',
    '$25k – $50k',
    '$50k+',
    'Not sure yet',
  ],
} as const
```

- [ ] **Step 5: Create the navigation**

Create `app/web/src/content/nav.ts`:

```ts
import type { NavItem } from './types'

/** Primary header navigation. Trailing slashes match next.config trailingSlash. */
export const nav: readonly NavItem[] = [
  { label: 'Services', href: '/services/' },
  { label: 'Work', href: '/work/' },
  { label: 'Process', href: '/process/' },
  { label: 'About', href: '/about/' },
  { label: 'Contact', href: '/contact/' },
]

/** Footer navigation, including the routes kept out of the header. */
export const footerNav: readonly NavItem[] = [
  ...nav,
  { label: 'Careers', href: '/careers/' },
  { label: 'Privacy', href: '/privacy/' },
  { label: 'Terms', href: '/terms/' },
]
```

- [ ] **Step 6: Create the UI strings**

Create `app/web/src/content/ui.ts`:

```ts
/** Strings a visitor reads, including accessible names. Copy lives in
 *  content; structural ARIA attributes stay inline in components. */
export const ui = {
  skipToContent: 'Skip to content',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  bookCall: 'Book a 30-minute call',
  contactFallback: 'Email us directly',
  formSubmit: 'Send message',
  formSending: 'Sending…',
  formSuccess: 'Thanks — we will reply within one working day.',
  formErrorValidation: 'Something was wrong with that submission. Please check and retry.',
  formErrorRateLimit: 'Too many attempts. Please wait a minute and try again.',
  formErrorServer: 'We could not send that. Please email us instead.',
  footerRights: 'All rights reserved.',
} as const
```

- [ ] **Step 7: Run the content test to verify it passes**

Run: `pnpm -F web exec vitest run src/content`
Expected: PASS.

- [ ] **Step 8: Write the failing env test**

Create `app/web/src/lib/env.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadEnv(values: Record<string, string | undefined>) {
  vi.resetModules()
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  return (await import('./env')).env
}

afterEach(() => {
  delete process.env['NEXT_PUBLIC_SITE_URL']
  delete process.env['NEXT_PUBLIC_CONTACT_ENDPOINT']
  delete process.env['NEXT_PUBLIC_BOOKING_URL']
  process.env['NODE_ENV'] = 'test'
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
      NEXT_PUBLIC_BOOKING_URL: 'https://calendar.app.google/Q1HABsUJA2gGwcWw5',
    })
    expect(env.bookingUrl).toBe('https://calendar.app.google/Q1HABsUJA2gGwcWw5')
  })

  it('strips a trailing slash from the site url so joins do not double up', async () => {
    const env = await loadEnv({ NEXT_PUBLIC_SITE_URL: 'https://mccorlabs.com/' })
    expect(env.siteUrl).toBe('https://mccorlabs.com')
  })
})
```

- [ ] **Step 9: Run it to verify it fails**

Run: `pnpm -F web exec vitest run src/lib/env.test.ts`
Expected: FAIL — cannot resolve `./env`.

- [ ] **Step 10: Create the env module**

Create `app/web/src/lib/env.ts`:

```ts
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
  if (value === null && process.env['NODE_ENV'] === 'production') {
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
    process.env['NEXT_PUBLIC_SITE_URL'],
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
    process.env['NEXT_PUBLIC_BOOKING_URL'],
  ),
  /** null means no endpoint is provisioned yet; the form degrades to email. */
  contactEndpoint: optionalUrl(
    'NEXT_PUBLIC_CONTACT_ENDPOINT',
    process.env['NEXT_PUBLIC_CONTACT_ENDPOINT'],
  ),
} as const
```

- [ ] **Step 11: Create the 1Password environment template**

Values live in 1Password, in the `Development` vault under an item named `mccor-labs`. This file holds `op://` *references*, not values — references are pointers and contain nothing secret, so this file is committed. There is no `.env.local` in this project.

Create `app/web/.env.template`:

```
# Resolved by `op run`. These are references, not values — safe to commit.
# Vault: Development · Item: mccor-labs
NEXT_PUBLIC_SITE_URL=op://Development/mccor-labs/site_url
NEXT_PUBLIC_BOOKING_URL=op://Development/mccor-labs/booking_url
NEXT_PUBLIC_CONTACT_ENDPOINT=op://Development/mccor-labs/contact_endpoint
```

The item must have fields `site_url`, `booking_url` and `contact_endpoint`. `contact_endpoint` may be empty until the owner provisions the API Gateway route; an empty value is treated the same as unset.

These are the only environment variables the site reads. `src/lib/env.ts` parses and
validates all of them at module load, so a malformed value fails the build rather than
producing a broken page. A static export inlines them at build time, which is why every
one is `NEXT_PUBLIC_` — none of them are secret, and none can be.

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | yes | Absolute base URL for `sitemap.ts`, `robots.ts`, canonical tags and Open Graph. Defaults to `https://mccorlabs.com`. Must be overridable so a preview environment does not advertise production URLs. |
| `NEXT_PUBLIC_BOOKING_URL` | no | Booking destination for the primary CTA. Unset ⇒ the CTA falls back to `site.contactEmail`. Point preview environments at a throwaway calendar rather than the real one. |
| `NEXT_PUBLIC_CONTACT_ENDPOINT` | no | Absolute URL of the contact endpoint on API Gateway. Unset ⇒ the form renders the booking link and an email address instead of a button that fails silently. |

All three are `NEXT_PUBLIC_`, so a static export compiles them into the published HTML. **None of them is secret and none can be.** 1Password is the single source of truth here so a new machine or a teammate gets correct values without guessing — not a secrecy mechanism.

- [ ] **Step 12: Run the env test to verify it passes**

Run: `pnpm -F web exec vitest run src/lib/env.test.ts`
Expected: PASS — all eight cases.

- [ ] **Step 13: Commit**

```bash
git add app/web/src/content app/web/src/lib/env.ts app/web/src/lib/env.test.ts app/web/.env.template
git commit -m "feat(web): typed content layer and validated public env"
```

---

