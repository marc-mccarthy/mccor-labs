'use client'

import { useEffect, useRef } from 'react'

import { CopyButton } from '@/components/ui/copy-button'
import { ui } from '@/content/ui'

interface ContactReceiptProps {
  reference: string | null
}

export function ContactReceipt({ reference }: ContactReceiptProps) {
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [])

  return (
    <div
      data-receipt=""
      className="relative rounded-lg border border-border bg-elevated p-6"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-0.5 rounded-t-lg bg-accent"
      />
      <h2
        ref={heading}
        tabIndex={-1}
        className="flex items-center gap-2 font-mono text-xs tracking-widest text-muted uppercase"
      >
        <span aria-hidden="true" data-receipt-tick="" className="size-2 bg-brand" />
        {ui.contactReceiptHeading}
      </h2>
      {reference === null ? (
        <p className="mt-3 text-sm text-muted">{ui.contactReceiptNext}</p>
      ) : (
        <span
          data-receipt-reference=""
          className="mt-3 block font-mono text-display-sm tracking-wide break-all text-text"
        >
          {reference}
        </span>
      )}
      {reference !== null && (
        <div className="mt-4">
          <CopyButton
            value={reference}
            label={ui.contactReceiptCopy}
            copiedLabel={ui.contactCopied}
            failedLabel={ui.contactCopyFailed}
            announce={false}
          />
        </div>
      )}
    </div>
  )
}
