'use client'

import Lenis from 'lenis'
import type { ReactNode, RefObject } from 'react'
import { createContext, useContext, useEffect, useRef } from 'react'

const LenisContext = createContext<RefObject<Lenis | null> | null>(null)

export function useLenis(): Lenis | null {
  return useContext(LenisContext)?.current ?? null
}

export function LenisProvider({ children }: { children: ReactNode }) {
  const instanceRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame: number | null = null

    const stop = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame)
        frame = null
      }
      instanceRef.current?.destroy()
      instanceRef.current = null
    }

    const start = () => {
      if (query.matches || instanceRef.current) return
      const instance = new Lenis({ anchors: true })
      instanceRef.current = instance
      const step = (time: number) => {
        instance.raf(time)
        frame = requestAnimationFrame(step)
      }
      frame = requestAnimationFrame(step)
    }

    const onChange = () => {
      if (query.matches) {
        stop()
      } else {
        start()
      }
    }

    start()
    query.addEventListener('change', onChange)

    return () => {
      query.removeEventListener('change', onChange)
      stop()
    }
  }, [])

  return <LenisContext.Provider value={instanceRef}>{children}</LenisContext.Provider>
}
