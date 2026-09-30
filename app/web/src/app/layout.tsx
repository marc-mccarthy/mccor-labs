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
