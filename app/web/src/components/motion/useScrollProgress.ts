'use client'

import type Lenis from 'lenis'
import type { RefObject } from 'react'
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useMotionValue, type MotionValue } from 'motion/react'
import { useLenis } from './LenisProvider'
import { useReducedMotion } from './useReducedMotion'

const NEAR_VIEWPORT = '50% 0px'

function measure(element: HTMLElement): number {
  const rect = element.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  return (viewportHeight - rect.top) / (viewportHeight + rect.height)
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function subscribeScroll(lenis: Lenis | null, update: () => void): () => void {
  if (lenis) return lenis.on('scroll', update)
  window.addEventListener('scroll', update, { passive: true })
  return () => {
    window.removeEventListener('scroll', update)
  }
}

function attachListeners(
  element: HTMLElement,
  lenis: Lenis | null,
  progress: MotionValue<number>,
): () => void {
  const update = () => {
    progress.set(clamp(measure(element)))
  }

  let frame: number | null = null
  const onResize = () => {
    frame ??= requestAnimationFrame(() => {
      frame = null
      update()
    })
  }

  update()
  window.addEventListener('resize', onResize, { passive: true })
  const stopScroll = subscribeScroll(lenis, update)

  return () => {
    window.removeEventListener('resize', onResize)
    if (frame !== null) cancelAnimationFrame(frame)
    stopScroll()
  }
}

function trackNearViewport(
  element: HTMLElement,
  lenis: Lenis | null,
  progress: MotionValue<number>,
): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    return attachListeners(element, lenis, progress)
  }

  progress.set(clamp(measure(element)))
  let detach: (() => void) | null = null
  const observer = new IntersectionObserver(
    (entries) => {
      const latest = entries.at(-1)
      if (!latest) return
      if (latest.isIntersecting) {
        detach ??= attachListeners(element, lenis, progress)
        return
      }
      detach?.()
      detach = null
      progress.set(measure(element) < 0.5 ? 0 : 1)
    },
    { rootMargin: NEAR_VIEWPORT },
  )
  observer.observe(element)

  return () => {
    observer.disconnect()
    detach?.()
  }
}

export function useScrollProgressValue(
  ref: RefObject<HTMLElement | null>,
): MotionValue<number> {
  const reducedMotion = useReducedMotion()
  const lenis = useLenis()
  const progress = useMotionValue(0)

  useEffect(() => {
    if (reducedMotion) {
      progress.set(0)
      return undefined
    }

    const element = ref.current
    if (!element) return undefined

    return trackNearViewport(element, lenis, progress)
  }, [lenis, progress, reducedMotion, ref])

  return progress
}

function serverSnapshot(): number {
  return 0
}

export function useScrollProgress(ref: RefObject<HTMLElement | null>): number {
  const progress = useScrollProgressValue(ref)
  const subscribe = useCallback(
    (onChange: () => void) => progress.on('change', onChange),
    [progress],
  )
  const getSnapshot = useCallback(() => progress.get(), [progress])
  return useSyncExternalStore(subscribe, getSnapshot, serverSnapshot)
}
