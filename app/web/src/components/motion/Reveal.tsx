'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LazyMotion, m } from 'motion/react'
import { loadDomAnimationFeatures } from './features'
import { readDurationSeconds, readEasing } from './tokens'
import { useReducedMotion } from './useReducedMotion'

export interface RevealProps {
  children: ReactNode
  delay?: number
  variant?: 'rise' | 'mask' | 'words'
  className?: string
}

const RISE_DISTANCE = 24

type MotionVariant = 'rise' | 'mask'

const HIDDEN = {
  rise: { opacity: 0, y: RISE_DISTANCE },
  mask: { clipPath: 'inset(0% 0% 100% 0%)' },
}

const SHOWN = {
  rise: { opacity: 1, y: 0 },
  mask: { clipPath: 'inset(0% 0% 0% 0%)' },
}

type FeaturePhase = 'pending' | 'ready' | 'shown' | 'failed'

function isInViewport(element: HTMLElement | null): boolean {
  if (!element) return false
  const rect = element.getBoundingClientRect()
  return rect.top < window.innerHeight && rect.bottom > 0
}

function WordsReveal({
  children,
  className,
}: Pick<RevealProps, 'children' | 'className'>) {
  const reducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<'pending' | 'armed' | 'shown'>('pending')
  const wrapper = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reducedMotion) return undefined
    const element = wrapper.current
    if (isInViewport(element) || typeof IntersectionObserver === 'undefined') {
      setPhase('shown')
      return undefined
    }
    setPhase('armed')
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setPhase('shown')
        observer.disconnect()
      }
    })
    if (element) observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [reducedMotion])

  if (reducedMotion) {
    return className ? <div className={className}>{children}</div> : <>{children}</>
  }

  return (
    <div ref={wrapper} data-reveal={phase} className={className}>
      {children}
    </div>
  )
}

function MotionReveal({
  children,
  delay,
  variant,
  className,
}: Omit<RevealProps, 'variant'> & { variant: MotionVariant }) {
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
    return className ? <div className={className}>{children}</div> : <>{children}</>
  }

  if (phase !== 'ready') {
    return (
      <div ref={placeholder} data-reveal={phase} className={className}>
        {children}
      </div>
    )
  }

  return (
    <LazyMotion features={loadDomAnimationFeatures}>
      <m.div
        data-reveal=""
        className={className}
        initial={HIDDEN[variant]}
        whileInView={SHOWN[variant]}
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

export function Reveal({ children, delay, variant = 'rise', className }: RevealProps) {
  if (variant === 'words') {
    return <WordsReveal className={className}>{children}</WordsReveal>
  }
  return (
    <MotionReveal delay={delay} variant={variant} className={className}>
      {children}
    </MotionReveal>
  )
}
