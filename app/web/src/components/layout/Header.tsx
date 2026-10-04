'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { Logo } from './Logo'
import { BookingCta } from './BookingCta'
import { Container } from './Container'
import { nav } from '@/content/nav'
import { ui } from '@/content/ui'

const UNDERLINE =
  'relative after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-accent hover:after:scale-x-100 motion-safe:after:transition-transform motion-safe:after:duration-(--duration-pointer) motion-safe:after:ease-(--ease-pointer) aria-[current=page]:text-text aria-[current=page]:after:scale-x-100 aria-[current=page]:after:bg-linear-to-r aria-[current=page]:after:from-brand aria-[current=page]:after:to-glow-red'

function stripTrailingSlash(path: string) {
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}

export function Header() {
  const pathname = usePathname()
  const current = stripTrailingSlash(pathname)
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      toggleRef.current?.focus()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <header
      data-site-header=""
      className="sticky top-0 z-40 border-b border-border bg-base/80 backdrop-blur"
    >
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          aria-label="McCor Labs home"
          className="transition-opacity hover:opacity-90"
        >
          <Logo size="sm" />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                stripTrailingSlash(item.href) === current ? 'page' : undefined
              }
              className={`text-sm text-muted transition-colors hover:text-text ${UNDERLINE}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block">
          <BookingCta size="sm" />
        </div>
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? ui.closeMenu : ui.openMenu}
          onClick={() => {
            setOpen((value) => !value)
          }}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text hover:bg-surface md:hidden"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {open ? (
              <path d="M4 4 L16 16 M16 4 L4 16" />
            ) : (
              <path d="M3 5 H17 M3 10 H17 M3 15 H17" />
            )}
          </svg>
        </button>
      </Container>
      <nav
        id="mobile-nav"
        aria-label="Primary"
        hidden={!open}
        className="border-t border-border md:hidden"
      >
        <Container className="flex flex-col gap-4 py-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                setOpen(false)
              }}
              aria-current={
                stripTrailingSlash(item.href) === current ? 'page' : undefined
              }
              className="text-sm text-muted transition-colors hover:text-text aria-[current=page]:text-text"
            >
              {item.label}
            </Link>
          ))}
        </Container>
      </nav>
    </header>
  )
}
