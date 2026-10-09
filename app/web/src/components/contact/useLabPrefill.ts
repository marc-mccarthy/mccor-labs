'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

import { decodeLabResult, formatLabResult } from '@/lib/labResult'

const PREFIX = '#lab='

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => {
    window.removeEventListener('hashchange', onChange)
  }
}

function readHash(): string {
  return window.location.hash
}

function serverHash(): string {
  return ''
}

export function useLabPrefill(): string | null {
  const hash = useSyncExternalStore(subscribe, readHash, serverHash)
  const [taken, setTaken] = useState<string | null>(null)
  if (hash.startsWith(PREFIX) && hash !== taken) setTaken(hash)

  useEffect(() => {
    if (taken !== null && window.location.hash === taken) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search,
      )
    }
  }, [taken])

  return useMemo(() => {
    if (taken === null) return null
    const result = decodeLabResult(taken.slice(PREFIX.length))
    return result === null ? null : formatLabResult(result)
  }, [taken])
}
