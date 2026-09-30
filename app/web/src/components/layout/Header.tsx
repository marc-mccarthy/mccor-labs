import Link from 'next/link'

import { BookingCta } from './BookingCta'
import { Container } from './Container'
import { nav } from '@/content/nav'
import { site } from '@/content/site'

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-base/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="font-semibold tracking-tight text-text">
          {site.name}
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted transition-colors hover:text-text"
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
