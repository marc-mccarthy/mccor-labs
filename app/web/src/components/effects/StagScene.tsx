'use client'

import type { ReactNode } from 'react'
import { readDurationSeconds } from '../motion/tokens'
import { SceneRuntime, type SceneContext, type SceneHandle } from './SceneRuntime'
import { buildScatterPositions, buildSeeds } from './stagAttributes'

export interface StagSceneProps {
  className?: string
  fallback: ReactNode
}

interface CloudExtents {
  midX: number
  midY: number
  height: number
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
const ASSEMBLE_DURATION_SCALE = 2
const FALLBACK_ASSEMBLE_SECONDS = 1.6
const POINTER_EASE = 0.08

let assembled = false

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
  return { midX: (minX + maxX) / 2, midY: (minY + maxY) / 2, height: maxY - minY }
}

function assembleSeconds(): number {
  const token = readDurationSeconds('--duration-scene')
  return Number.isFinite(token)
    ? token * ASSEMBLE_DURATION_SCALE
    : FALLBACK_ASSEMBLE_SECONDS
}

function buildStag(context: SceneContext): SceneHandle {
  const { THREE, canvas, renderer, pixelRatio, color, fail } = context
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10)
  const uniforms = {
    uTime: { value: 0 },
    uProgress: { value: assembled ? 1 : 0 },
    uPointSize: { value: 2 },
    uPointer: { value: new THREE.Vector2(-9999, -9999) },
    uPointerForce: { value: 0 },
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
  let extents: CloudExtents = { midX: 0, midY: 0, height: 2 }

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = canvas
    if (width === 0 || height === 0) return
    renderer.setSize(width, height, false)
    const scale = Math.max(width / POSTER_WIDTH, height / POSTER_HEIGHT)
    const objectX =
      window.innerWidth >= LG_BREAKPOINT ? POSTER_OBJECT_X_LG : POSTER_OBJECT_X
    const stagX = (width - POSTER_WIDTH * scale) * objectX + POSTER_STAG_CENTER_X * scale
    const stagY = (height - POSTER_HEIGHT * scale) / 2 + POSTER_STAG_CENTER_Y * scale
    const stagPixels = POSTER_STAG_HEIGHT * scale
    const unitsPerPixel = extents.height / stagPixels
    camera.left = extents.midX - stagX * unitsPerPixel
    camera.right = extents.midX + (width - stagX) * unitsPerPixel
    camera.top = extents.midY + stagY * unitsPerPixel
    camera.bottom = extents.midY - (height - stagY) * unitsPerPixel
    camera.updateProjectionMatrix()
    uniforms.uPointSize.value =
      Math.min(
        MAX_POINT_SIZE,
        Math.max(MIN_POINT_SIZE, stagPixels / POINT_SIZE_DIVISOR),
      ) * pixelRatio
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

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  window.addEventListener('pointermove', onPointerMove, { passive: true })

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
    })
    .catch(fail)

  return {
    render: (time) => {
      if (!points) return
      const seconds = time / 1000
      startSeconds ??= seconds
      uniforms.uTime.value = seconds
      if (!assembled) {
        uniforms.uProgress.value = Math.min(
          1,
          (seconds - startSeconds) / assembleDuration,
        )
        assembled = uniforms.uProgress.value >= 1
      }
      uniforms.uPointerForce.value +=
        ((pointerInside ? 1 : 0) - uniforms.uPointerForce.value) * POINTER_EASE
      renderer.render(scene, camera)
    },
    dispose: () => {
      disposed = true
      resizeObserver.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      geometry?.dispose()
      material?.dispose()
    },
  }
}

export function StagScene({ className, fallback }: StagSceneProps) {
  return <SceneRuntime className={className} fallback={fallback} build={buildStag} />
}
