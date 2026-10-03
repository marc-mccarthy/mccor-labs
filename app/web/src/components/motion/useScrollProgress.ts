'use client'

import type { RefObject } from 'react'
import { useEffect, useState } from 'react'
import { useLenis } from './LenisProvider'
import { useReducedMotion } from './useReducedMotion'

export function useScrollProgress(ref: RefObject<HTMLElement | null>): number {
  const reducedMotion = useReducedMotion()
  const lenis = useLenis()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (reducedMotion) return undefined

    const element = ref.current
    if (!element) return undefined

    const update = () => {
      const rect = element.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const raw = (viewportHeight - rect.top) / (viewportHeight + rect.height)
      setProgress(Math.min(1, Math.max(0, raw)))
    }

    update()

    if (lenis) {
      return lenis.on('scroll', update)
    }

    window.addEventListener('scroll', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
    }
  }, [lenis, reducedMotion, ref])

  return progress
}
