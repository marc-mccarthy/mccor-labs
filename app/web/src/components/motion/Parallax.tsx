'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { LazyMotion, m, useMotionValue } from 'motion/react'
import { loadDomAnimationFeatures } from './features'
import { useReducedMotion } from './useReducedMotion'
import { useScrollProgress } from './useScrollProgress'

export interface ParallaxProps {
  children: ReactNode
  speed?: number
}

export function Parallax({ children, speed = 0.3 }: ParallaxProps) {
  const reducedMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement | null>(null)
  const y = useMotionValue(0)
  const progress = useScrollProgress(ref)

  useEffect(() => {
    if (reducedMotion) return
    y.set((progress - 0.5) * speed * window.innerHeight)
  }, [progress, reducedMotion, speed, y])

  if (reducedMotion) {
    return <div ref={ref}>{children}</div>
  }

  return (
    <LazyMotion features={loadDomAnimationFeatures}>
      <m.div ref={ref} style={{ y }}>
        {children}
      </m.div>
    </LazyMotion>
  )
}
