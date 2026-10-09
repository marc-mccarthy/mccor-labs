'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

import { decodeLabResult, formatLabResult } from '@/lib/labResult'

const PREFIX = '#lab='

const SEPARATOR = '|'

let changes = 0

function subscribe(onChange: () => void): () => void {
  function onHashChange() {
    changes += 1
    onChange()
  }
  window.addEventListener('hashchange', onHashChange)
  return () => {
    window.removeEventListener('hashchange', onHashChange)
  }
}

function readSnapshot(): string {
  return `${String(changes)}${SEPARATOR}${window.location.hash}`
}

function serverSnapshot(): string {
  return `0${SEPARATOR}`
}

export function useLabPrefill(): string | null {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, serverSnapshot)
  const hash = snapshot.slice(snapshot.indexOf(SEPARATOR) + 1)
  const [taken, setTaken] = useState<string | null>(null)
  if (hash.startsWith(PREFIX) && hash !== taken) setTaken(hash)

  useEffect(() => {
    if (window.location.hash.startsWith(PREFIX)) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search,
      )
    }
  }, [snapshot])

  return useMemo(() => {
    if (taken === null) return null
    const result = decodeLabResult(taken.slice(PREFIX.length))
    return result === null ? null : formatLabResult(result)
  }, [taken])
}
