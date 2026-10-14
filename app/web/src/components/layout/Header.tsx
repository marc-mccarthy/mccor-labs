'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type CSSProperties } from 'react'

import { Logo } from './Logo'
import { BookingCta } from './BookingCta'
import { Container } from './Container'
import { UNDERLINE } from './underline'
import { MotionPauseToggle } from '@/components/motion/MotionPauseToggle'
import { nav } from '@/content/nav'
import { ui } from '@/content/ui'

const BAR =
  'origin-center [transform-box:fill-box] motion-safe:transition-[translate,rotate,opacity] motion-safe:duration-(--duration-standard) motion-safe:ease-(--ease-standard)'

const MOBILE_NAV =
  'border-t border-border md:hidden motion-safe:transition-[display,opacity,translate] motion-safe:transition-discrete motion-safe:duration-(--duration-standard) motion-safe:ease-(--ease-standard) motion-safe:starting:-translate-y-2 motion-safe:starting:opacity-0 motion-safe:[&[hidden]]:-translate-y-2 motion-safe:[&[hidden]]:opacity-0 motion-safe:[&[hidden]]:duration-(--duration-pointer)'

const MOBILE_ITEM =
  'motion-safe:transition-[opacity,translate] motion-safe:duration-(--duration-standard) motion-safe:ease-(--ease-standard) motion-safe:delay-[calc(var(--i)*var(--stagger-interval))] motion-safe:starting:translate-y-2 motion-safe:starting:opacity-0'

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
        <Link href="/" aria-label="McCor Labs home" className="press hover:opacity-90">
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
              className={`press text-sm text-muted hover:text-text ${UNDERLINE}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <BookingCta size="sm" />
          </div>
          <MotionPauseToggle />
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? ui.closeMenu : ui.openMenu}
            onClick={() => {
              setOpen((value) => !value)
            }}
            className="inline-flex h-10 w-10 press items-center justify-center rounded-full text-text hover:bg-surface md:hidden"
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
              <line
                x1="3"
                y1="5"
                x2="17"
                y2="5"
                className={`${BAR} ${open ? 'translate-y-[5px] rotate-45' : ''}`}
              />
              <line
                x1="3"
                y1="10"
                x2="17"
                y2="10"
                className={`${BAR} ${open ? 'opacity-0' : ''}`}
              />
              <line
                x1="3"
                y1="15"
                x2="17"
                y2="15"
                className={`${BAR} ${open ? '-translate-y-[5px] -rotate-45' : ''}`}
              />
            </svg>
          </button>
        </div>
      </Container>
      <nav id="mobile-nav" aria-label="Primary" hidden={!open} className={MOBILE_NAV}>
        <Container className="flex flex-col gap-1 py-4">
          {nav.map((item, index) => (
            <div
              key={item.href}
              style={{ '--i': index } as CSSProperties}
              className={MOBILE_ITEM}
            >
              <Link
                href={item.href}
                onClick={() => {
                  setOpen(false)
                }}
                aria-current={
                  stripTrailingSlash(item.href) === current ? 'page' : undefined
                }
                className="flex min-h-11 press items-center text-sm text-muted hover:text-text aria-[current=page]:text-text"
              >
                {item.label}
              </Link>
            </div>
          ))}
          <div
            style={{ '--i': nav.length } as CSSProperties}
            onClickCapture={() => {
              setOpen(false)
            }}
            className={`${MOBILE_ITEM} pt-3 [&_a]:w-full [&>span]:block`}
          >
            <BookingCta />
          </div>
        </Container>
      </nav>
    </header>
  )
}
