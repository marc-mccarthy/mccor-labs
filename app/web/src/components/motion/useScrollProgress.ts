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

    let frame: number | null = null
    const onResize = () => {
      frame ??= requestAnimationFrame(() => {
        frame = null
        update()
      })
    }

    update()
    window.addEventListener('resize', onResize, { passive: true })

    let stopScroll: () => void
    if (lenis) {
      stopScroll = lenis.on('scroll', update)
    } else {
      window.addEventListener('scroll', update, { passive: true })
      stopScroll = () => {
        window.removeEventListener('scroll', update)
      }
    }

    return () => {
      window.removeEventListener('resize', onResize)
      if (frame !== null) cancelAnimationFrame(frame)
      stopScroll()
    }
  }, [lenis, reducedMotion, ref])

  return progress
}
