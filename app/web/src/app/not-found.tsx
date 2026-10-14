import Link from 'next/link'

import { BookingCta } from '@/components/layout/BookingCta'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <Section>
      <Container>
        <p className="font-mono text-sm tracking-widest text-brand uppercase">
          404 · Signal Lost
        </p>
        <svg
          viewBox="0 0 240 48"
          width="240"
          height="48"
          aria-hidden="true"
          className="mt-6 h-12 w-60 max-w-full"
        >
          <line
            x1="30"
            y1="24"
            x2="190"
            y2="24"
            pathLength="1"
            strokeDasharray="1"
            className="stroke-brand motion-safe:animate-[signal-draw_var(--duration-scene)_var(--ease-standard)_both]"
            strokeWidth="1.5"
          />
          <circle cx="24" cy="24" r="6" className="fill-brand" />
          <circle cx="120" cy="24" r="6" className="fill-brand" />
          <circle
            cx="216"
            cy="24"
            r="6"
            className="fill-none stroke-border-strong"
            strokeWidth="1.5"
          />
        </svg>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-text sm:text-5xl">
          That Page Does Not Exist
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          The link may be out of date. Everything else is still where you left it.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button asChild>
            <Link href="/">Back to the Home Page</Link>
          </Button>
          <BookingCta />
        </div>
      </Container>
    </Section>
  )
}
