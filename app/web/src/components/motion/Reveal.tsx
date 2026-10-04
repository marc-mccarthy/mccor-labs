'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LazyMotion, m } from 'motion/react'
import { loadDomAnimationFeatures } from './features'
import { readDurationSeconds, readEasing } from './tokens'
import { useReducedMotion } from './useReducedMotion'

export interface RevealProps {
  children: ReactNode
  delay?: number
}

const RISE_DISTANCE = 24

type FeaturePhase = 'pending' | 'ready' | 'shown' | 'failed'

function isInViewport(element: HTMLElement | null): boolean {
  if (!element) return false
  const rect = element.getBoundingClientRect()
  return rect.top < window.innerHeight && rect.bottom > 0
}

export function Reveal({ children, delay }: RevealProps) {
  const reducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<FeaturePhase>('pending')
  const placeholder = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reducedMotion) return undefined
    let cancelled = false
    loadDomAnimationFeatures().then(
      () => {
        if (!cancelled) setPhase(isInViewport(placeholder.current) ? 'shown' : 'ready')
      },
      () => {
        if (!cancelled) setPhase('failed')
      },
    )
    return () => {
      cancelled = true
    }
  }, [reducedMotion])

  if (reducedMotion) {
    return <>{children}</>
  }

  if (phase !== 'ready') {
    return (
      <div ref={placeholder} data-reveal={phase}>
        {children}
      </div>
    )
  }

  return (
    <LazyMotion features={loadDomAnimationFeatures}>
      <m.div
        data-reveal=""
        initial={{ opacity: 0, y: RISE_DISTANCE }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          duration: readDurationSeconds('--duration-standard'),
          delay: delay ?? readDurationSeconds('--delay-considered'),
          ease: readEasing('--ease-standard'),
        }}
      >
        {children}
      </m.div>
    </LazyMotion>
  )
}
