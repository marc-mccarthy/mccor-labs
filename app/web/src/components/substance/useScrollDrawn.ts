'use client'

import { type CSSProperties, useEffect, useRef, useState } from 'react'

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

  const isDrawn = reducedMotion || drawn

  const edgeStyle = (index: number): CSSProperties => ({
    strokeDashoffset: isDrawn ? 0 : 1,
    ...(reducedMotion
      ? { transitionProperty: 'none' }
      : {
          transitionProperty: 'stroke-dashoffset',
          transitionDuration: 'var(--duration-scene)',
          transitionTimingFunction: 'var(--ease-standard)',
          transitionDelay: `calc(${String(index)} * var(--stagger-interval))`,
        }),
  })

  const nodeStroke = (index: number): CSSProperties => ({
    stroke: isDrawn ? 'var(--color-brand)' : 'var(--color-border-strong)',
    ...(reducedMotion
      ? { transitionProperty: 'none' }
      : {
          transitionProperty: 'stroke',
          transitionDuration: 'var(--duration-pointer)',
          transitionTimingFunction: 'var(--ease-standard)',
          transitionDelay:
            index === 0
              ? '0s'
              : `calc(${String(index - 1)} * var(--stagger-interval) + var(--duration-scene))`,
        }),
  })

  return { ref, edgeStyle, nodeStroke }
}
