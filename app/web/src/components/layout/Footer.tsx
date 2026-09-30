import Link from 'next/link'

import { Container } from './Container'
import { footerNav } from '@/content/nav'
import { site } from '@/content/site'
import { ui } from '@/content/ui'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border">
      <Container className="flex flex-col gap-8 py-12 sm:flex-row sm:justify-between">
        <div>
          <p className="font-semibold text-text">{site.name}</p>
          <p className="mt-2 max-w-sm text-sm text-muted">{site.tagline}</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2">
          {footerNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted transition-colors hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </Container>
      <Container className="border-t border-border py-6">
        <p className="text-xs text-muted">
          © {new Date().getFullYear()} {site.name}. {ui.footerRights}
        </p>
      </Container>
    </footer>
  )
}
