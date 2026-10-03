'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { LazyMotion, m, useMotionValue } from 'motion/react'
import { loadDomAnimationFeatures } from './features'
import { useLenis } from './LenisProvider'
import { useReducedMotion } from './useReducedMotion'

export interface ParallaxProps {
  children: ReactNode
  speed?: number
}

export function Parallax({ children, speed = 0.3 }: ParallaxProps) {
  const reducedMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement | null>(null)
  const y = useMotionValue(0)
  const lenis = useLenis()

  useEffect(() => {
    if (reducedMotion) return undefined

    const element = ref.current
    if (!element) return undefined

    const update = () => {
      const rect = element.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const progress = (viewportHeight - rect.top) / (viewportHeight + rect.height)
      y.set((progress - 0.5) * speed * viewportHeight)
    }

    update()

    if (lenis) {
      return lenis.on('scroll', update)
    }

    window.addEventListener('scroll', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
    }
  }, [lenis, reducedMotion, speed, y])

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
