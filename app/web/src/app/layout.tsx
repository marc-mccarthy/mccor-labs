import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { SkipLink } from '@/components/layout/SkipLink'
import { LenisProvider } from '@/components/motion/LenisProvider'
import { site } from '@/content/site'
import { env } from '@/lib/env'
import '@/styles/globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.tagline,
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icon.svg',
  },
  openGraph: { siteName: site.name, type: 'website', locale: 'en' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link
          rel="preload"
          href="/fonts/geist-sans-variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="flex min-h-dvh flex-col">
        <SkipLink />
        <Header />
        <LenisProvider>
          <main id="main" className="flex-1">
            {children}
          </main>
        </LenisProvider>
        <Footer />
      </body>
    </html>
  )
}
