import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { SkipLink } from '@/components/layout/SkipLink'
import { LenisProvider } from '@/components/motion/LenisProvider'
import { MotionPauseProvider } from '@/components/motion/MotionPauseProvider'
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

const RESTORE_MOTION_PAUSE = `try{if(localStorage.getItem('mccor-motion')==='paused')document.documentElement.dataset.motion='paused'}catch(error){reportError(error)}`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: RESTORE_MOTION_PAUSE }} />
        <link
          rel="preload"
          href="/fonts/geist-sans-variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/geist-mono-variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <noscript>
          <style>
            {
              '[data-reveal]{opacity:1!important;transform:none!important}[data-reveal] [data-word]{transform:none!important}[data-stage-descriptor]{opacity:1!important}'
            }
          </style>
        </noscript>
      </head>
      <body className="flex min-h-dvh flex-col">
        <MotionPauseProvider>
          <SkipLink />
          <Header />
          <LenisProvider>
            <main id="main" className="flex-1">
              {children}
            </main>
          </LenisProvider>
          <Footer />
        </MotionPauseProvider>
      </body>
    </html>
  )
}
