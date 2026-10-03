'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useReducedMotion } from '../motion/useReducedMotion'

export type SceneStatus = 'idle' | 'active' | 'fallback'

export interface SceneContext {
  THREE: typeof import('three')
  canvas: HTMLCanvasElement
  renderer: import('three').WebGLRenderer
  pixelRatio: number
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

let threeModulePromise: Promise<typeof import('three')> | null = null

function loadThree(): Promise<typeof import('three')> {
  threeModulePromise ??= import('three')
  return threeModulePromise
}

function supportsWebGL2(): boolean {
  const probe = document.createElement('canvas')
  const context = probe.getContext('webgl2')
  if (!context) return false
  context.getExtension('WEBGL_lose_context')?.loseContext()
  return true
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState<SceneStatus>('idle')

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

    const onContextLost = (event: Event) => {
      event.preventDefault()
      if (frameId !== null) cancelAnimationFrame(frameId)
      frameId = null
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
          handle = build({ THREE, canvas, renderer: nextRenderer, pixelRatio })
          setStatus('active')

          const loop = (time: number) => {
            if (lastTime !== null) sceneTime += time - lastTime
            lastTime = time
            handle?.render(sceneTime)
            frameId = requestAnimationFrame(loop)
          }
          const resume = () => {
            if (frameId === null && handle) frameId = requestAnimationFrame(loop)
          }
          const pause = () => {
            if (frameId !== null) cancelAnimationFrame(frameId)
            frameId = null
            lastTime = null
          }
          resume()

          const root = rootRef.current
          if (root && typeof IntersectionObserver !== 'undefined') {
            observer = new IntersectionObserver((entries) => {
              if (entries.at(-1)?.isIntersecting) resume()
              else pause()
            })
            observer.observe(root)
          }
        })
        .catch(() => {
          if (!cancelled) setStatus('fallback')
        })
    }

    const cancelIdle = whenIdleAfterLoad(start)

    return () => {
      cancelled = true
      cancelIdle()
      observer?.disconnect()
      if (frameId !== null) cancelAnimationFrame(frameId)
      handle?.dispose()
      if (renderer) {
        mountedCanvas?.removeEventListener('webglcontextlost', onContextLost)
        renderer.forceContextLoss()
        renderer.dispose()
      }
    }
  }, [reducedMotion, build])

  return (
    <div ref={rootRef} className={className} data-scene-status={status}>
      <canvas
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
