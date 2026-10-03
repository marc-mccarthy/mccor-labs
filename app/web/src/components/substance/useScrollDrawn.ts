'use client'

import { useEffect, useRef, useState } from 'react'

export function useScrollDrawn(reducedMotion: boolean) {
  const ref = useRef<SVGSVGElement | null>(null)
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    if (reducedMotion) return undefined
    const element = ref.current
    if (!element) return undefined
    if (typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setDrawn(true)
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [reducedMotion])

  return { ref, dashOffset: reducedMotion || drawn ? 0 : 1 }
}
