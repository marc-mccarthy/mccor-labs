import type { ReactNode } from 'react'

import { BookingCta } from '@/components/layout/BookingCta'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { Spotlight } from '@/components/motion/Spotlight'
import { CopyButton } from '@/components/ui/copy-button'
import { GlowField } from '@/components/ui/glow-field'
import { inlineLink } from '@/components/ui/inline-link'
import { site } from '@/content/site'
import { ui } from '@/content/ui'
import { env } from '@/lib/env'

function Aside({ live }: { live: boolean }) {
  return (
    <aside data-sticky-layout className="self-start lg:sticky lg:top-24">
      <h2 className="text-xl font-semibold text-text">{ui.contactAsideHeading}</h2>
      {live ? (
        <dl className="mt-6 space-y-6">
          <div>
            <dt className="mb-1 text-sm text-muted">{ui.contactAsideEmail}</dt>
            <dd className="flex flex-wrap items-center gap-3">
              <a href={`mailto:${site.contactEmail}`} className={inlineLink}>
                {site.contactEmail}
              </a>
              <CopyButton
                value={site.contactEmail}
                label={ui.contactCopyEmail}
                copiedLabel={ui.contactCopied}
                failedLabel={ui.contactCopyFailed}
              />
            </dd>
          </div>
          {env.bookingUrl !== null && (
            <div className="group-has-[[data-lab-strip]]/panel:hidden">
              <dt className="mb-1 text-sm text-muted">{ui.contactAsideBook}</dt>
              <dd className="[&_a]:px-0">
                <BookingCta variant="link" />
              </dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="mt-4 text-muted">{ui.contactAsideFallback}</p>
      )}
    </aside>
  )
}

export function ContactPanel({
  endpoint,
  children,
}: {
  endpoint: string | null
  children: ReactNode
}) {
  return (
    <Section size="compact" className="relative isolate">
      <GlowField anchor="right" />
      <Container>
        <div className="group/panel grid gap-(--space-2xl) lg:grid-cols-[minmax(0,36rem)_1fr]">
          <div
            data-panel-cell=""
            className="group relative isolate rounded-xl border border-border bg-surface p-6 sm:p-8"
          >
            <Spotlight size="panel" trigger="focus-within" />
            <span
              aria-hidden="true"
              data-panel-edge=""
              data-signal-sweep=""
              className="absolute inset-x-6 top-0 h-px"
            />
            {children}
          </div>
          <Aside live={endpoint !== null} />
        </div>
      </Container>
    </Section>
  )
}
