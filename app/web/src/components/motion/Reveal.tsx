'use client'

import type { ReactNode } from 'react'
import { LazyMotion, m } from 'motion/react'
import { loadDomAnimationFeatures } from './features'
import { readDurationSeconds, readEasing } from './tokens'
import { useReducedMotion } from './useReducedMotion'

export interface RevealProps {
  children: ReactNode
  delay?: number
}

const RISE_DISTANCE = 24

export function Reveal({ children, delay }: RevealProps) {
  const reducedMotion = useReducedMotion()

  if (reducedMotion) {
    return <>{children}</>
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
