'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useLenis } from '../motion/LenisProvider'
import { readToken } from '../motion/tokens'
import { useReducedMotion } from '../motion/useReducedMotion'

export type SceneStatus = 'idle' | 'active' | 'fallback'

export interface SceneContext {
  THREE: typeof import('three')
  canvas: HTMLCanvasElement
  renderer: import('three').WebGLRenderer
  pixelRatio: number
  color: (name: string) => import('three').Color
  fail: () => void
  fitToCanvas: (onResize: (width: number, height: number) => void) => () => void
  velocityRef: { readonly current: number }
}

export interface SceneHandle {
  render: (time: number) => void
  dispose: () => void
}

export interface SceneRuntimeProps {
  className?: string
  fallback: ReactNode
  build: (context: SceneContext) => SceneHandle
}

const MAX_PIXEL_RATIO = 1.5
const VELOCITY_RANGE = 60
const VELOCITY_EASE = 0.1
const VELOCITY_REST = 0.001

export function easeVelocity(current: number, raw: number): number {
  const target = Math.max(-1, Math.min(1, raw / VELOCITY_RANGE))
  const next = current + (target - current) * VELOCITY_EASE
  return Math.abs(next) < VELOCITY_REST ? 0 : next
}

let threeModulePromise: Promise<typeof import('three')> | null = null

export function loadThree(): Promise<typeof import('three')> {
  threeModulePromise ??= import('three').catch((error: unknown) => {
    threeModulePromise = null
    throw error
  })
  return threeModulePromise
}

let webgl2Support: boolean | null = null

export function resetWebGL2Probe(): void {
  webgl2Support = null
}

function supportsWebGL2(): boolean {
  if (webgl2Support !== null) return webgl2Support
  const probe = document.createElement('canvas')
  const context = probe.getContext('webgl2')
  webgl2Support = context !== null
  context?.getExtension('WEBGL_lose_context')?.loseContext()
  return webgl2Support
}

function whenIdleAfterLoad(callback: () => void): () => void {
  let idleHandle: number | null = null
  let timeoutHandle: number | null = null

  const schedule = () => {
    if (typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(callback)
    } else {
      timeoutHandle = window.setTimeout(callback, 0)
    }
  }

  if (document.readyState === 'complete') {
    schedule()
  } else {
    window.addEventListener('load', schedule, { once: true })
  }

  return () => {
    window.removeEventListener('load', schedule)
    if (idleHandle !== null) window.cancelIdleCallback(idleHandle)
    if (timeoutHandle !== null) window.clearTimeout(timeoutHandle)
  }
}

export function SceneRuntime({ className, fallback, build }: SceneRuntimeProps) {
  const reducedMotion = useReducedMotion()
  const lenis = useLenis()
  const lenisRef = useRef(lenis)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const buildRef = useRef(build)
  const [status, setStatus] = useState<SceneStatus>('idle')
  const [canvasKey, setCanvasKey] = useState(0)

  useEffect(() => {
    buildRef.current = build
  }, [build])

  useEffect(() => {
    lenisRef.current = lenis
  }, [lenis])

  useEffect(() => {
    const bailToFallback = () => {
      setStatus('fallback')
    }

    if (typeof window === 'undefined') return undefined
    if (reducedMotion) {
      bailToFallback()
      return undefined
    }
    if (!supportsWebGL2()) {
      bailToFallback()
      return undefined
    }

    let cancelled = false
    let handle: SceneHandle | null = null
    let renderer: import('three').WebGLRenderer | null = null
    let frameId: number | null = null
    let mountedCanvas: HTMLCanvasElement | null = null
    let observer: IntersectionObserver | null = null
    let lastTime: number | null = null
    let sceneTime = 0
    let visible = false
    let started = false
    let cancelIdle: (() => void) | null = null
    const velocityRef = { current: 0 }

    const loop = (time: number) => {
      if (lastTime !== null) sceneTime += time - lastTime
      lastTime = time
      velocityRef.current = easeVelocity(
        velocityRef.current,
        lenisRef.current?.velocity ?? 0,
      )
      handle?.render(sceneTime)
      frameId = requestAnimationFrame(loop)
    }
    const resume = () => {
      if (frameId === null && handle && visible) frameId = requestAnimationFrame(loop)
    }
    const pause = () => {
      if (frameId !== null) cancelAnimationFrame(frameId)
      frameId = null
      lastTime = null
    }

    const teardown = () => {
      observer?.disconnect()
      pause()
      handle?.dispose()
      handle = null
      if (renderer) {
        mountedCanvas?.removeEventListener('webglcontextlost', onContextLost)
        renderer.forceContextLoss()
        renderer.dispose()
        renderer = null
      }
    }

    const onContextLost = (event: Event) => {
      event.preventDefault()
      pause()
      handle?.dispose()
      handle = null
      setStatus('fallback')
    }

    const start = () => {
      const canvas = canvasRef.current
      if (cancelled || !canvas) return
      mountedCanvas = canvas

      loadThree()
        .then((THREE) => {
          if (cancelled) return
          const pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO)
          const nextRenderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
          })
          nextRenderer.setPixelRatio(pixelRatio)
          renderer = nextRenderer
          canvas.addEventListener('webglcontextlost', onContextLost)
          const fitToCanvas: SceneContext['fitToCanvas'] = (onResize) => {
            const resize = () => {
              const { clientWidth: width, clientHeight: height } = canvas
              if (width === 0 || height === 0) return
              nextRenderer.setSize(width, height, false)
              onResize(width, height)
            }
            const resizeObserver = new ResizeObserver(resize)
            resizeObserver.observe(canvas)
            resize()
            return () => {
              resizeObserver.disconnect()
            }
          }
          handle = buildRef.current({
            THREE,
            canvas,
            renderer: nextRenderer,
            pixelRatio,
            color: (name) =>
              new THREE.Color().setStyle(readToken(name), THREE.LinearSRGBColorSpace),
            fail: () => {
              teardown()
              setStatus('fallback')
            },
            fitToCanvas,
            velocityRef,
          })
          setStatus('active')

          resume()
        })
        .catch(() => {
          if (!cancelled) setStatus('fallback')
        })
    }

    const startOnce = () => {
      if (started) return
      started = true
      cancelIdle = whenIdleAfterLoad(start)
    }

    const root = rootRef.current
    if (root && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver((entries) => {
        visible = entries.at(-1)?.isIntersecting ?? false
        if (visible) {
          startOnce()
          resume()
        } else {
          pause()
        }
      })
      observer.observe(root)
    } else {
      visible = true
      startOnce()
    }

    return () => {
      cancelled = true
      cancelIdle?.()
      teardown()
      setCanvasKey((key) => key + 1)
    }
  }, [reducedMotion])

  return (
    <div ref={rootRef} className={className} data-scene-status={status}>
      <canvas
        key={canvasKey}
        ref={canvasRef}
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 h-full w-full',
          status !== 'active' && 'hidden',
        )}
      />
      {status !== 'active' ? fallback : null}
    </div>
  )
}
