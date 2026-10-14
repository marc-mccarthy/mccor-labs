'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { LazyMotion, m, useMotionValue } from 'motion/react'
import { loadDomAnimationFeatures } from './features'
import { useMotionPausedFlag } from './MotionPauseProvider'
import { useReducedMotion } from './useReducedMotion'
import { useScrollProgressValue } from './useScrollProgress'

export interface ParallaxProps {
  children: ReactNode
  speed?: number
}

export function Parallax({ children, speed = 0.3 }: ParallaxProps) {
  const reducedMotion = useReducedMotion()
  const paused = useMotionPausedFlag()
  const ref = useRef<HTMLDivElement | null>(null)
  const y = useMotionValue(0)
  const progress = useScrollProgressValue(ref)

  useEffect(() => {
    if (reducedMotion) return undefined
    if (paused) {
      y.set(0)
      return undefined
    }
    const follow = (value: number) => {
      y.set((value - 0.5) * speed * window.innerHeight)
    }
    follow(progress.get())
    return progress.on('change', follow)
  }, [paused, progress, reducedMotion, speed, y])

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
