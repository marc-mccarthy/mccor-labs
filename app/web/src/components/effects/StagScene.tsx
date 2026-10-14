'use client'

import { useMotionValue, type MotionValue } from 'motion/react'
import { useCallback, useEffect, useState, type ReactNode, type RefObject } from 'react'
import { useLenis } from '../motion/LenisProvider'
import { useMotionPausedFlag } from '../motion/MotionPauseProvider'
import { readDurationSeconds } from '../motion/tokens'
import { useReducedMotion } from '../motion/useReducedMotion'
import { SceneRuntime, type SceneContext, type SceneHandle } from './SceneRuntime'
import { buildScatterPositions, buildSeeds } from './stagAttributes'
import { roundStagExit, stagExitAmount } from './stagExit'

export type StagLayout = 'poster' | 'centred'

export type StagAssembly = 'mount' | 'view'

export interface StagSceneProps {
  className?: string
  fallback: ReactNode
  exitTarget?: RefObject<HTMLElement | null>
  instanceId?: string
  layout?: StagLayout
  assembleOn?: StagAssembly
}

interface StagOptions {
  instanceId: string
  layout: StagLayout
  assembleOn: StagAssembly
  exit?: MotionValue<number>
  pause: PauseSignal
}

interface PauseSignal {
  readonly current: boolean
  subscribe: (listener: () => void) => () => void
}

interface PauseSource extends PauseSignal {
  set: (paused: boolean) => void
}

interface CloudExtents {
  midX: number
  midY: number
  width: number
  height: number
}

interface Framing {
  left: number
  right: number
  top: number
  bottom: number
  stagPixels: number
}

interface StagAssets {
  positions: Float32Array
  extents: CloudExtents
  vertexShader: string
  fragmentShader: string
}

const ASSET_ROOT = '/media/brand'
const POSTER_WIDTH = 1376
const POSTER_HEIGHT = 768
const POSTER_STAG_CENTER_X = 1149
const POSTER_STAG_CENTER_Y = 310
const POSTER_STAG_HEIGHT = 500
const POSTER_OBJECT_X = 1
const POSTER_OBJECT_X_LG = 0.92
const LG_BREAKPOINT = 1024
const POINT_SIZE_DIVISOR = 170
const MIN_POINT_SIZE = 1.5
const MAX_POINT_SIZE = 4
const DEFAULT_POINT_SIZE = 2
const ASSEMBLE_DURATION_SCALE = 2
const FALLBACK_ASSEMBLE_SECONDS = 1.6
const POINTER_EASE = 0.08
const VELOCITY_STRETCH = 0.08
const EXIT_ATTRIBUTE = 'data-stag-exit'
const ASSEMBLED_ATTRIBUTE = 'data-stag-assembled'
const CENTRED_FILL = 0.9
const VIEW_SPAN = 1.5
const VIEW_EASE = 0.1
const VIEW_SETTLE = 0.001

const assembledInstances = new Set<string>()

async function fetchAsset(path: string): Promise<Response> {
  const response = await fetch(`${ASSET_ROOT}/${path}`)
  if (!response.ok)
    throw new Error(`Stag asset ${path} failed with ${String(response.status)}`)
  return response
}

async function loadAssets(): Promise<StagAssets> {
  const [points, vertexShader, fragmentShader] = await Promise.all([
    fetchAsset('stag-points.json').then(
      (r) => r.json() as Promise<{ positions: number[] }>,
    ),
    fetchAsset('shaders/stag-points.vert.glsl').then((r) => r.text()),
    fetchAsset('shaders/stag-points.frag.glsl').then((r) => r.text()),
  ])
  const positions = new Float32Array(points.positions)
  return { positions, extents: measure(positions), vertexShader, fragmentShader }
}

function measure(positions: Float32Array): CloudExtents {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  positions.forEach((value, index) => {
    if (index % 3 === 0) {
      minX = Math.min(minX, value)
      maxX = Math.max(maxX, value)
    } else if (index % 3 === 1) {
      minY = Math.min(minY, value)
      maxY = Math.max(maxY, value)
    }
  })
  return {
    midX: (minX + maxX) / 2,
    midY: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function posterFraming(width: number, height: number, extents: CloudExtents): Framing {
  const scale = Math.max(width / POSTER_WIDTH, height / POSTER_HEIGHT)
  const objectX =
    window.innerWidth >= LG_BREAKPOINT ? POSTER_OBJECT_X_LG : POSTER_OBJECT_X
  const stagX = (width - POSTER_WIDTH * scale) * objectX + POSTER_STAG_CENTER_X * scale
  const stagY = (height - POSTER_HEIGHT * scale) / 2 + POSTER_STAG_CENTER_Y * scale
  const stagPixels = POSTER_STAG_HEIGHT * scale
  const unitsPerPixel = extents.height / stagPixels
  return {
    left: extents.midX - stagX * unitsPerPixel,
    right: extents.midX + (width - stagX) * unitsPerPixel,
    top: extents.midY + stagY * unitsPerPixel,
    bottom: extents.midY - (height - stagY) * unitsPerPixel,
    stagPixels,
  }
}

function centredFraming(width: number, height: number, extents: CloudExtents): Framing {
  const unitsPerPixel = Math.max(
    extents.height / (height * CENTRED_FILL),
    extents.width / (width * CENTRED_FILL),
  )
  const halfWidth = (width / 2) * unitsPerPixel
  const halfHeight = (height / 2) * unitsPerPixel
  return {
    left: extents.midX - halfWidth,
    right: extents.midX + halfWidth,
    top: extents.midY + halfHeight,
    bottom: extents.midY - halfHeight,
    stagPixels: extents.height / unitsPerPixel,
  }
}

const FRAMINGS: Record<StagLayout, typeof posterFraming> = {
  poster: posterFraming,
  centred: centredFraming,
}

function viewAmount(element: HTMLElement): number | null {
  const rect = element.getBoundingClientRect()
  if (rect.height === 0) return null
  const amount = (window.innerHeight - rect.top) / (rect.height * VIEW_SPAN)
  return Math.min(1, Math.max(0, amount))
}

function assembleSeconds(): number {
  const token = readDurationSeconds('--duration-scene')
  return Number.isFinite(token)
    ? token * ASSEMBLE_DURATION_SCALE
    : FALLBACK_ASSEMBLE_SECONDS
}

function trackExit(
  exit: MotionValue<number> | undefined,
  uniform: { value: number },
  root: HTMLElement | null,
): () => void {
  if (!exit) return () => undefined
  let written: string | null = null
  const apply = (value: number) => {
    uniform.value = value
    const rounded = roundStagExit(value)
    if (rounded === written) return
    written = rounded
    root?.setAttribute(EXIT_ATTRIBUTE, rounded)
  }
  apply(exit.get())
  const stop = exit.on('change', apply)
  return () => {
    stop()
    root?.removeAttribute(EXIT_ATTRIBUTE)
  }
}

function buildStag(context: SceneContext, options: StagOptions): SceneHandle {
  const { THREE, canvas, renderer, pixelRatioRef, color, fail, velocityRef } = context
  const { instanceId, layout, assembleOn, exit, pause } = options
  const root = canvas.parentElement
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10)
  let assembled = assembledInstances.has(instanceId)
  const uniforms = {
    uTime: { value: 0 },
    uProgress: { value: assembled ? 1 : 0 },
    uPointSize: { value: DEFAULT_POINT_SIZE },
    uPointer: { value: new THREE.Vector2(-9999, -9999) },
    uPointerForce: { value: 0 },
    uExit: { value: 0 },
    uColorBase: { value: color('--color-base') },
    uColorBrand: { value: color('--color-brand') },
    uColorAccent: { value: color('--color-accent') },
  }

  const assembleDuration = assembleSeconds()
  let points: import('three').Points | null = null
  let geometry: import('three').BufferGeometry | null = null
  let material: import('three').ShaderMaterial | null = null
  let disposed = false
  let startSeconds: number | null = null
  let pointerInside = false
  let extents: CloudExtents = { midX: 0, midY: 0, width: 2, height: 2 }
  let basePointSize = DEFAULT_POINT_SIZE
  let viewTarget = 0
  let lastSeconds = 0

  const complete = () => {
    assembled = true
    uniforms.uProgress.value = 1
    assembledInstances.add(instanceId)
    root?.setAttribute(ASSEMBLED_ATTRIBUTE, 'true')
  }

  const advanceOnMount = (seconds: number) => {
    startSeconds ??= seconds
    uniforms.uProgress.value = Math.min(1, (seconds - startSeconds) / assembleDuration)
    if (uniforms.uProgress.value >= 1) complete()
  }

  const advanceOnView = () => {
    const amount = root ? viewAmount(root) : null
    if (amount !== null) viewTarget = Math.max(viewTarget, amount)
    const current = uniforms.uProgress.value
    const next = current + (viewTarget - current) * VIEW_EASE
    if (1 - next < VIEW_SETTLE) complete()
    else uniforms.uProgress.value = next
  }

  const advance = assembleOn === 'view' ? advanceOnView : advanceOnMount

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = canvas
    if (width === 0 || height === 0) return
    renderer.setSize(width, height, false)
    const framing = FRAMINGS[layout](width, height, extents)
    camera.left = framing.left
    camera.right = framing.right
    camera.top = framing.top
    camera.bottom = framing.bottom
    camera.updateProjectionMatrix()
    basePointSize = Math.min(
      MAX_POINT_SIZE,
      Math.max(MIN_POINT_SIZE, framing.stagPixels / POINT_SIZE_DIVISOR),
    )
  }

  const draw = (seconds: number) => {
    if (!points) return
    uniforms.uTime.value = seconds
    uniforms.uPointSize.value = basePointSize * pixelRatioRef.current
    uniforms.uPointerForce.value +=
      ((pointerInside ? 1 : 0) - uniforms.uPointerForce.value) * POINTER_EASE
    const stretch = 1 + Math.abs(velocityRef.current) * VELOCITY_STRETCH
    points.scale.y = stretch
    points.position.y = extents.midY * (1 - stretch)
    renderer.render(scene, camera)
  }

  const settle = () => {
    if (!assembled) complete()
    draw(lastSeconds)
  }

  const onPauseChange = () => {
    if (pause.current && points && !assembled) settle()
  }

  const onPointerMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    pointerInside = x >= 0 && x <= 1 && y >= 0 && y <= 1
    const worldX = camera.left + x * (camera.right - camera.left)
    const worldY = camera.top + y * (camera.bottom - camera.top)
    uniforms.uPointer.value.set(worldX, worldY)
  }

  if (assembled) root?.setAttribute(ASSEMBLED_ATTRIBUTE, 'true')
  const stopExit = trackExit(exit, uniforms.uExit, root)
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  const stopPause = pause.subscribe(onPauseChange)

  loadAssets()
    .then(({ positions, extents: measured, vertexShader, fragmentShader }) => {
      if (disposed) return
      extents = measured
      const count = positions.length / 3
      geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute(
        'aScatterPos',
        new THREE.BufferAttribute(buildScatterPositions(count), 3),
      )
      geometry.setAttribute('aSeed', new THREE.BufferAttribute(buildSeeds(count), 1))
      material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      })
      points = new THREE.Points(geometry, material)
      points.frustumCulled = false
      scene.add(points)
      resize()
      if (pause.current) settle()
    })
    .catch(fail)

  return {
    render: (time) => {
      if (!points) return
      const seconds = time / 1000
      lastSeconds = seconds
      if (!assembled) advance(seconds)
      draw(seconds)
    },
    dispose: () => {
      disposed = true
      stopExit()
      stopPause()
      root?.removeAttribute(ASSEMBLED_ATTRIBUTE)
      resizeObserver.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      geometry?.dispose()
      material?.dispose()
    },
  }
}

function useStagExit(target: RefObject<HTMLElement | null> | undefined) {
  const reducedMotion = useReducedMotion()
  const lenis = useLenis()
  const exit = useMotionValue(0)

  useEffect(() => {
    const element = target?.current
    if (reducedMotion || !element) return undefined
    let height = element.offsetHeight
    const update = () => {
      exit.set(stagExitAmount(window.scrollY, height))
    }
    const remeasure = () => {
      height = element.offsetHeight
      update()
    }
    update()
    window.addEventListener('resize', remeasure, { passive: true })
    const stopLenis = lenis?.on('scroll', update)
    if (!lenis) window.addEventListener('scroll', update, { passive: true })
    return () => {
      window.removeEventListener('resize', remeasure)
      window.removeEventListener('scroll', update)
      stopLenis?.()
    }
  }, [exit, lenis, reducedMotion, target])

  return target ? exit : undefined
}

function createPauseSource(initial: boolean): PauseSource {
  const listeners = new Set<() => void>()
  let current = initial
  return {
    get current() {
      return current
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    set(paused) {
      if (paused === current) return
      current = paused
      for (const listener of listeners) listener()
    },
  }
}

function usePauseSignal(): PauseSignal {
  const paused = useMotionPausedFlag()
  const [source] = useState(() => createPauseSource(paused))
  useEffect(() => {
    source.set(paused)
  }, [paused, source])
  return source
}

export function StagScene({
  className,
  fallback,
  exitTarget,
  instanceId = 'hero',
  layout = 'poster',
  assembleOn = 'mount',
}: StagSceneProps) {
  const exit = useStagExit(exitTarget)
  const pause = usePauseSignal()
  const build = useCallback(
    (context: SceneContext) =>
      buildStag(context, { instanceId, layout, assembleOn, exit, pause }),
    [assembleOn, exit, instanceId, layout, pause],
  )
  return (
    <div data-stag-instance={instanceId} className={className}>
      <SceneRuntime className="absolute inset-0" fallback={fallback} build={build} />
    </div>
  )
}
