'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { readColorToken, readDurationSeconds } from '../motion/tokens'
import { SceneRuntime, type SceneContext, type SceneHandle } from './SceneRuntime'
import { buildScatterPositions, buildSeeds } from './stagAttributes'

export interface StagSceneProps {
  className?: string
  fallback: ReactNode
}

interface StagAssets {
  positions: Float32Array
  vertexShader: string
  fragmentShader: string
}

const ASSET_ROOT = '/media/brand'
const VIEW_HALF_HEIGHT = 1.2
const STAG_HALF_WIDTH = 1.1
const SPLIT_LAYOUT_ASPECT = 1.3
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
  return { positions: new Float32Array(points.positions), vertexShader, fragmentShader }
}

function assembleSeconds(): number {
  const token = readDurationSeconds('--duration-scene')
  return Number.isFinite(token)
    ? token * ASSEMBLE_DURATION_SCALE
    : FALLBACK_ASSEMBLE_SECONDS
}

function buildStag(context: SceneContext, onError: () => void): SceneHandle {
  const { THREE, canvas, renderer, pixelRatio } = context
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(
    -VIEW_HALF_HEIGHT,
    VIEW_HALF_HEIGHT,
    VIEW_HALF_HEIGHT,
    -VIEW_HALF_HEIGHT,
    -10,
    10,
  )
  const color = (name: string) =>
    new THREE.Color().setStyle(readColorToken(name), THREE.LinearSRGBColorSpace)
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

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = canvas
    if (width === 0 || height === 0) return
    renderer.setSize(width, height, false)
    const halfWidth = VIEW_HALF_HEIGHT * (width / height)
    camera.left = -halfWidth
    camera.right = halfWidth
    camera.updateProjectionMatrix()
    uniforms.uPointSize.value = Math.min(5, Math.max(1.5, height / 260)) * pixelRatio
    if (points) {
      points.position.x =
        width / height > SPLIT_LAYOUT_ASPECT ? halfWidth - STAG_HALF_WIDTH : 0
    }
  }

  const onPointerMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    pointerInside = x >= 0 && x <= 1 && y >= 0 && y <= 1
    const worldX = (x * 2 - 1) * camera.right - (points?.position.x ?? 0)
    const worldY = (1 - y * 2) * VIEW_HALF_HEIGHT
    uniforms.uPointer.value.set(worldX, worldY)
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  window.addEventListener('pointermove', onPointerMove, { passive: true })

  loadAssets()
    .then(({ positions, vertexShader, fragmentShader }) => {
      if (disposed) return
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
    .catch(onError)

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
  const [failed, setFailed] = useState(false)
  const build = useCallback(
    (context: SceneContext) =>
      buildStag(context, () => {
        setFailed(true)
      }),
    [],
  )

  if (failed) return <div className={className}>{fallback}</div>
  return <SceneRuntime className={className} fallback={fallback} build={build} />
}
