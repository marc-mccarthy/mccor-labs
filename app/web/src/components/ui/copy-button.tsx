'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'

const COPIED_MS = 2000

type CopyState = 'idle' | 'copied' | 'failed'

interface CopyButtonProps {
  value: string
  label: string
  copiedLabel: string
  failedLabel: string
  announce?: boolean
}

export function CopyButton({
  value,
  label,
  copiedLabel,
  failedLabel,
  announce = true,
}: CopyButtonProps) {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const clearTimer = useCallback(() => {
    if (timer.current !== undefined) {
      clearTimeout(timer.current)
      timer.current = undefined
    }
  }, [])

  useEffect(() => clearTimer, [clearTimer])

  const copy = useCallback(async () => {
    clearTimer()
    try {
      const clipboard = navigator.clipboard as Clipboard | undefined
      if (!clipboard) throw new Error('clipboard unavailable')
      await clipboard.writeText(value)
    } catch {
      setState('failed')
      return
    }
    setState('copied')
    timer.current = setTimeout(() => {
      timer.current = undefined
      setState('idle')
    }, COPIED_MS)
  }, [value, clearTimer])

  return (
    <div className="inline-flex flex-wrap items-center gap-3">
      <Button
        variant="secondary"
        size="sm"
        aria-label={announce || state !== 'copied' ? label : copiedLabel}
        onClick={() => void copy()}
      >
        {state === 'copied' ? copiedLabel : label}
      </Button>
      {state === 'failed' ? (
        <p role={announce ? undefined : 'alert'} className="text-sm text-brand">
          {failedLabel}
        </p>
      ) : null}
      {announce ? (
        <span role="status" aria-live="polite" className="sr-only">
          {state === 'copied' ? copiedLabel : state === 'failed' ? failedLabel : ''}
        </span>
      ) : null}
    </div>
  )
}
