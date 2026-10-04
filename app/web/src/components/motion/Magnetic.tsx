'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { usePointerEffects } from './useReducedMotion'

const PULL = 0.2
const MAX_SHIFT_PX = 6

function clampShift(value: number): number {
  return Math.max(-MAX_SHIFT_PX, Math.min(MAX_SHIFT_PX, value * PULL))
}

export function Magnetic({ children }: { children: ReactNode }) {
  const enabled = usePointerEffects()
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!enabled || !element) return undefined
    let frame: number | null = null
    let x = 0
    let y = 0

    const write = () => {
      frame = null
      element.style.transform = `translate3d(${String(x)}px, ${String(y)}px, 0)`
    }
    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      x = clampShift(event.clientX - (rect.left + rect.width / 2))
      y = clampShift(event.clientY - (rect.top + rect.height / 2))
      frame ??= requestAnimationFrame(write)
    }
    const onLeave = () => {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
      element.style.transform = ''
    }

    element.addEventListener('pointermove', onMove)
    element.addEventListener('pointerleave', onLeave)
    return () => {
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerleave', onLeave)
      onLeave()
    }
  }, [enabled])

  return (
    <span
      ref={ref}
      data-magnetic=""
      className="inline-flex transition-transform duration-(--duration-standard) ease-(--ease-pointer)"
    >
      {children}
    </span>
  )
}
