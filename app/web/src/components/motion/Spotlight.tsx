'use client'

import { useEffect, useRef } from 'react'
import { usePointerEffects } from './useReducedMotion'

const GLOW =
  'radial-gradient(18rem circle at var(--spot-x) var(--spot-y), color-mix(in oklab, var(--color-brand) 16%, transparent), transparent)'

export function Spotlight() {
  const enabled = usePointerEffects()
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const glow = ref.current
    const card = glow?.parentElement
    if (!glow || !card) return undefined
    const onMove = (event: PointerEvent) => {
      const rect = card.getBoundingClientRect()
      glow.style.setProperty('--spot-x', `${String(event.clientX - rect.left)}px`)
      glow.style.setProperty('--spot-y', `${String(event.clientY - rect.top)}px`)
    }
    card.addEventListener('pointermove', onMove)
    return () => {
      card.removeEventListener('pointermove', onMove)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-spotlight=""
      className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-(--duration-standard) ease-(--ease-pointer) group-hover:opacity-100"
      style={{ backgroundImage: GLOW }}
    />
  )
}
