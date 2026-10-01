## Task 9: Layout shell and the ten route skeletons

**Files:**
- Create: `app/web/src/components/layout/{Container,Section,SkipLink,BookingCta,Header,Footer}.tsx`
- Create: `app/web/src/components/sections/PageHeader.tsx`
- Create: `app/web/src/app/layout.tsx`, `app/web/src/app/page.tsx`
- Create: `app/web/src/app/{services,work,about,process,contact,careers,privacy,terms}/page.tsx`
- Create: `app/web/src/app/not-found.tsx`
- Create: `app/web/src/components/layout/layout.test.tsx`

**Interfaces:**
- Consumes: Tasks 7 and 8.
- Produces: `<Container>`, `<Section>`, `<PageHeader title description>`, `<Header>`, `<Footer>`, `<BookingCta>`; ten exported routes.

- [ ] **Step 1: Write the failing layout test**

Create `app/web/src/components/layout/layout.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Footer } from './Footer'
import { Header } from './Header'
import { SkipLink } from './SkipLink'
import { footerNav, nav } from '@/content/nav'
import { site } from '@/content/site'
import { ui } from '@/content/ui'
import { env } from '@/lib/env'

describe('Header', () => {
  it('renders every primary nav destination', () => {
    render(<Header />)
    for (const item of nav) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute(
        'href',
        item.href,
      )
    }
  })

  it('offers a working call to action whether or not booking is configured', () => {
    render(<Header />)
    if (env.bookingUrl === null) {
      const cta = screen.getByRole('link', { name: ui.contactFallback })
      expect(cta).toHaveAttribute('href', `mailto:${site.contactEmail}`)
    } else {
      const cta = screen.getByRole('link', { name: ui.bookCall })
      expect(cta).toHaveAttribute('href', env.bookingUrl)
      expect(cta).toHaveAttribute('rel', expect.stringContaining('noopener'))
    }
  })
})

describe('Footer', () => {
  it('renders every footer destination including legal routes', () => {
    render(<Footer />)
    for (const item of footerNav) {
      expect(screen.getAllByRole('link', { name: item.label }).length).toBeGreaterThan(0)
    }
  })
})

describe('SkipLink', () => {
  it('targets the main landmark', () => {
    render(<SkipLink />)
    expect(screen.getByRole('link', { name: ui.skipToContent })).toHaveAttribute(
      'href',
      '#main',
    )
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm -F web exec vitest run src/components/layout`
Expected: FAIL — cannot resolve `./Footer`.

- [ ] **Step 3: Create the primitives**

Create `app/web/src/components/layout/Container.tsx`:

```tsx
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', className)} {...props} />
}
```

Create `app/web/src/components/layout/Section.tsx`:

```tsx
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export function Section({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn('py-16 sm:py-24', className)} {...props} />
}
```

Create `app/web/src/components/layout/SkipLink.tsx`:

```tsx
import { ui } from '@/content/ui'

export function SkipLink() {
  return (
    <a
      href="#main"
      className="bg-accent text-base sr-only rounded-full px-4 py-2 focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
    >
      {ui.skipToContent}
    </a>
  )
}
```

Create `app/web/src/components/layout/BookingCta.tsx`:

```tsx
import { Button } from '@/components/ui/button'
import { site } from '@/content/site'
import { ui } from '@/content/ui'
import { env } from '@/lib/env'

type BookingCtaProps = {
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Primary call to action. With no booking URL configured it degrades to an
 * email link rather than rendering a dead button — the same pattern the
 * contact form uses when its endpoint is unset.
 */
export function BookingCta({ size = 'md' }: BookingCtaProps) {
  if (env.bookingUrl === null) {
    return (
      <Button asChild size={size}>
        <a href={`mailto:${site.contactEmail}`}>{ui.contactFallback}</a>
      </Button>
    )
  }

  return (
    <Button asChild size={size}>
      <a href={env.bookingUrl} target="_blank" rel="noopener noreferrer">
        {ui.bookCall}
      </a>
    </Button>
  )
}
```

- [ ] **Step 4: Create the Header and Footer**

Create `app/web/src/components/layout/Header.tsx`:

```tsx
import Link from 'next/link'

import { BookingCta } from './BookingCta'
import { Container } from './Container'
import { nav } from '@/content/nav'
import { site } from '@/content/site'

export function Header() {
  return (
    <header className="border-border sticky top-0 z-40 border-b bg-base/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="text-text font-semibold tracking-tight">
          {site.name}
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted hover:text-text text-sm transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block">
          <BookingCta size="sm" />
        </div>
      </Container>
    </header>
  )
}
```

A mobile menu is deliberately deferred to phase 2, where the nav gets its
designed treatment; the links remain reachable in the footer meanwhile.

Create `app/web/src/components/layout/Footer.tsx`:

```tsx
import Link from 'next/link'

import { Container } from './Container'
import { footerNav } from '@/content/nav'
import { site } from '@/content/site'
import { ui } from '@/content/ui'

export function Footer() {
  return (
    <footer className="border-border mt-24 border-t">
      <Container className="flex flex-col gap-8 py-12 sm:flex-row sm:justify-between">
        <div>
          <p className="text-text font-semibold">{site.name}</p>
          <p className="text-muted mt-2 max-w-sm text-sm">{site.tagline}</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2">
          {footerNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted hover:text-text text-sm transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </Container>
      <Container className="border-border border-t py-6">
        <p className="text-muted text-xs">
          © {new Date().getFullYear()} {site.name}. {ui.footerRights}
        </p>
      </Container>
    </footer>
  )
}
```

- [ ] **Step 5: Run the layout test to verify it passes**

Run: `pnpm -F web exec vitest run src/components/layout`
Expected: PASS.

- [ ] **Step 6: Create the shared page header**

Create `app/web/src/components/sections/PageHeader.tsx`:

```tsx
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'

type PageHeaderProps = {
  title: string
  description: string
}

/** Every route renders exactly one of these, which is what guarantees one h1
 *  per page. Phase 2 replaces the visual treatment, not the structure. */
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <Section>
      <Container>
        <h1 className="text-text text-4xl font-semibold tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="text-muted mt-4 max-w-2xl text-lg">{description}</p>
      </Container>
    </Section>
  )
}
```

- [ ] **Step 7: Create the root layout**

Create `app/web/src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { SkipLink } from '@/components/layout/SkipLink'
import { site } from '@/content/site'
import { env } from '@/lib/env'
import '@/styles/globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.tagline,
  openGraph: { siteName: site.name, type: 'website', locale: 'en' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  // data-theme is reserved for a future light mode; it is unused today and
  // keeps that retrofit to one token block rather than a rewrite.
  return (
    <html lang="en" data-theme="dark">
      <body className="flex min-h-dvh flex-col">
        <SkipLink />
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
```

- [ ] **Step 8: Create the home route**

Create `app/web/src/app/page.tsx`:

```tsx
import { BookingCta } from '@/components/layout/BookingCta'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { site } from '@/content/site'

export default function HomePage() {
  return (
    <>
      <Section>
        <Container>
          <h1 className="text-text max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">
            {site.tagline}
          </h1>
          {/* Phase 3 replaces this section's background with the signature
              WebGL moment. The composition stays; the effect sits behind it. */}
          <div className="mt-10">
            <BookingCta size="lg" />
          </div>
        </Container>
      </Section>
    </>
  )
}
```

- [ ] **Step 9: Create the eight inner routes**

Each is a `PageHeader` with route metadata. Create each file with this shape, substituting the values from the table below.

`app/web/src/app/services/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { PageHeader } from '@/components/sections/PageHeader'

export const metadata: Metadata = {
  title: 'Services',
  description: 'What we build, and how we price it.',
}

export default function ServicesPage() {
  return (
    <PageHeader
      title="Services"
      description="What we build, and how we price it."
    />
  )
}
```

Repeat for the remaining seven, changing the directory, component name, title and description:

| Directory | Component | Title | Description |
|---|---|---|---|
| `work` | `WorkPage` | `Work` | `Case studies are in production. Talk to us in the meantime.` |
| `about` | `AboutPage` | `About` | `A small senior team, and how we work together.` |
| `process` | `ProcessPage` | `Process` | `How an engagement runs, from first call to launch.` |
| `contact` | `ContactPage` | `Contact` | `Tell us about the project, or book a call directly.` |
| `careers` | `CareersPage` | `Careers` | `How we hire, and what we look for.` |
| `privacy` | `PrivacyPage` | `Privacy Policy` | `How we handle information you send us.` |
| `terms` | `TermsPage` | `Terms` | `The terms that apply to this site.` |

- [ ] **Step 10: Create the 404 route**

Create `app/web/src/app/not-found.tsx`:

```tsx
import Link from 'next/link'

import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <Section>
      <Container>
        <h1 className="text-text text-4xl font-semibold tracking-tight sm:text-5xl">
          That page does not exist
        </h1>
        <p className="text-muted mt-4 max-w-xl text-lg">
          The link may be out of date. Everything else is still where you left it.
        </p>
        <div className="mt-10">
          <Button asChild>
            <Link href="/">Back to the home page</Link>
          </Button>
        </div>
      </Container>
    </Section>
  )
}
```

- [ ] **Step 11: Build and verify the exported file shape**

This pins Review Focus item 3 — the single thing a broken static export would hide.

```bash
pnpm -F web build
for p in index services/index work/index about/index process/index \
         contact/index careers/index privacy/index terms/index 404; do
  test -f "app/web/out/$p.html" && echo "ok   $p.html" || echo "MISSING $p.html"
done
```

Expected: ten `ok` lines, no `MISSING`. A missing `404.html` means `not-found.tsx` did not export; a missing `services/index.html` means `trailingSlash` is not set.

- [ ] **Step 12: Verify each route contains its own content, not the home page's**

```bash
grep -q 'What we build' app/web/out/services/index.html && echo "ok services distinct"
grep -q 'in production' app/web/out/work/index.html && echo "ok work distinct"
grep -q 'does not exist' app/web/out/404.html && echo "ok 404 distinct"
```

Expected: three `ok` lines.

- [ ] **Step 13: Commit**

```bash
git add app/web/src/components app/web/src/app
git commit -m "feat(web): layout shell and ten route skeletons"
```

---

