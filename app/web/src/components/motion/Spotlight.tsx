'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import { usePointerEffects } from './useReducedMotion'

const RADIUS = { card: '18rem', panel: '32rem' } as const

function glowFor(size: keyof typeof RADIUS) {
  return `radial-gradient(${RADIUS[size]} circle at var(--spot-x) var(--spot-y), color-mix(in oklab, var(--color-brand) 16%, transparent), transparent)`
}

const BASE =
  'pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-(--duration-standard) ease-(--ease-pointer) group-hover:opacity-100'

const TRIGGER_CLASS = {
  hover: BASE,
  'focus-within': `${BASE} group-focus-within:opacity-100`,
} as const

type Trigger = keyof typeof TRIGGER_CLASS

function styleFor(size: keyof typeof RADIUS, trigger: Trigger): CSSProperties {
  const backgroundImage = glowFor(size)
  if (trigger === 'hover') return { backgroundImage }
  return { backgroundImage, '--spot-x': '50%', '--spot-y': '0%' } as CSSProperties
}

interface SpotlightProps {
  size?: keyof typeof RADIUS
  trigger?: Trigger
}

export function Spotlight({ size = 'card', trigger = 'hover' }: SpotlightProps) {
  const enabled = usePointerEffects()
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const glow = ref.current
    const card = glow?.parentElement
    if (!glow || !card) return undefined
    let rect: DOMRect | null = null
    let frame = 0
    let x = 0
    let y = 0
    const write = () => {
      frame = 0
      if (!rect) return
      glow.style.setProperty('--spot-x', `${String(x - rect.left)}px`)
      glow.style.setProperty('--spot-y', `${String(y - rect.top)}px`)
    }
    const onEnter = () => {
      rect = card.getBoundingClientRect()
    }
    const onMove = (event: PointerEvent) => {
      rect ??= card.getBoundingClientRect()
      x = event.clientX
      y = event.clientY
      if (frame === 0) frame = requestAnimationFrame(write)
    }
    const onScroll = () => {
      rect = null
    }
    card.addEventListener('pointerenter', onEnter)
    card.addEventListener('pointermove', onMove)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      card.removeEventListener('pointerenter', onEnter)
      card.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
      if (frame !== 0) cancelAnimationFrame(frame)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-spotlight=""
      className={TRIGGER_CLASS[trigger]}
      style={styleFor(size, trigger)}
    />
  )
}
