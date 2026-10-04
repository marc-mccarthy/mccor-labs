'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LazyMotion, m } from 'motion/react'
import { loadDomAnimationFeatures } from './features'
import { readDurationSeconds, readEasing } from './tokens'
import { useReducedMotion } from './useReducedMotion'

export interface RevealProps {
  children: ReactNode
  delay?: number
  variant?: 'rise' | 'mask'
}

const RISE_DISTANCE = 24

const HIDDEN = {
  rise: { opacity: 0, y: RISE_DISTANCE },
  mask: { clipPath: 'inset(0% 0% 100% 0%)' },
}

const SHOWN = {
  rise: { opacity: 1, y: 0 },
  mask: { clipPath: 'inset(0% 0% 0% 0%)' },
}

const DURATION = { rise: '--duration-standard', mask: '--duration-scene' }

type FeaturePhase = 'pending' | 'ready' | 'shown' | 'failed'

function isInViewport(element: HTMLElement | null): boolean {
  if (!element) return false
  const rect = element.getBoundingClientRect()
  return rect.top < window.innerHeight && rect.bottom > 0
}

export function Reveal({ children, delay, variant = 'rise' }: RevealProps) {
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
        initial={HIDDEN[variant]}
        whileInView={SHOWN[variant]}
        viewport={{ once: true }}
        transition={{
          duration: readDurationSeconds(DURATION[variant]),
          delay: delay ?? readDurationSeconds('--delay-considered'),
          ease: readEasing('--ease-standard'),
        }}
      >
        {children}
      </m.div>
    </LazyMotion>
  )
}
