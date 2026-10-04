'use client'

import { useCallback, useSyncExternalStore } from 'react'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const FINE_POINTER = '(hover: hover) and (pointer: fine)'

function getServerSnapshot(): boolean {
  return false
}

function noopUnsubscribe(): undefined {
  return undefined
}

function supported(): boolean {
  return typeof window.matchMedia === 'function'
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!supported()) return noopUnsubscribe
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => {
        list.removeEventListener('change', onChange)
      }
    },
    [query],
  )
  const getSnapshot = useCallback(
    () => supported() && window.matchMedia(query).matches,
    [query],
  )
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION)
}

export function usePointerEffects(): boolean {
  const reduced = useReducedMotion()
  const fine = useMediaQuery(FINE_POINTER)
  return fine && !reduced
}
