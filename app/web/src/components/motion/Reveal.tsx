'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { LazyMotion, m } from 'motion/react'
import { loadDomAnimationFeatures } from './features'
import { readDurationSeconds, readEasing } from './tokens'
import { useReducedMotion } from './useReducedMotion'

export interface RevealProps {
  children: ReactNode
  delay?: number
}

const RISE_DISTANCE = 24

type FeaturePhase = 'pending' | 'ready' | 'failed'

export function Reveal({ children, delay }: RevealProps) {
  const reducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<FeaturePhase>('pending')

  useEffect(() => {
    if (reducedMotion) return undefined
    let cancelled = false
    loadDomAnimationFeatures().then(
      () => {
        if (!cancelled) setPhase('ready')
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
    return <div data-reveal="">{children}</div>
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
