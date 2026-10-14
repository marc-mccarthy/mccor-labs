'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { ui } from '@/content/ui'

export const SENT_TOAST_MS = 5000

export function SentToast() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
    }, SENT_TOAST_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [])

  if (!visible) return null

  return createPortal(
    <div
      aria-hidden="true"
      data-sent-toast=""
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6 sm:justify-end"
    >
      <div className="relative overflow-hidden rounded-lg border border-border bg-elevated px-5 py-3 text-sm text-text motion-on:animate-[sent-toast-in_var(--duration-standard)_var(--ease-standard)_backwards]">
        <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" />
        {ui.contactToastSent}
      </div>
    </div>,
    document.body,
  )
}
