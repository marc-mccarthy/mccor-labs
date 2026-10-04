'use client'

import { useCallback, useRef } from 'react'
import { buildCloud, CLOUD_COUNT, PIPELINE_SEED, stagePosition } from './pipelinePath'
import { SceneRuntime, type SceneContext, type SceneHandle } from './SceneRuntime'
import { useProgressRef } from './useProgressRef'

export interface Pipeline3DProps {
  stages: readonly string[]
  progress: number
  className?: string
}

const FIELD_OF_VIEW = 55
const POINT_SIZE = 0.07
const LABEL_LIFT = 0.45
const CAMERA_TRAVEL = 0.92
const LOOK_AHEAD = 0.08

function buildPipeline(
  context: SceneContext,
  stageCount: number,
  labels: HTMLElement[],
  progressRef: { current: number },
): SceneHandle {
  const { THREE, canvas, renderer, color, fitToCanvas } = context
  const stagePoints = Array.from(
    { length: stageCount },
    (_, index) => new THREE.Vector3(...stagePosition(index)),
  )
  const curve = new THREE.CatmullRomCurve3(stagePoints)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(buildCloud(PIPELINE_SEED, CLOUD_COUNT, stageCount), 3),
  )
  const material = new THREE.PointsMaterial({
    color: color('--color-accent'),
    size: POINT_SIZE,
    transparent: true,
    opacity: 0.8,
  })
  const scene = new THREE.Scene()
  scene.add(new THREE.Points(geometry, material))
  const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 60)

  const anchor = new THREE.Vector3()
  const projected = new THREE.Vector3()
  let drawn = -1

  const placeLabels = () => {
    const { clientWidth: width, clientHeight: height } = canvas
    labels.forEach((label, index) => {
      const point = stagePoints[index]
      if (!point) return
      projected
        .copy(anchor.copy(point))
        .setY(point.y + LABEL_LIFT)
        .project(camera)
      const visible = projected.z > -1 && projected.z < 1
      const x = ((projected.x + 1) / 2) * width
      const y = ((1 - projected.y) / 2) * height
      label.style.transform = `translate(${String(x)}px, ${String(y)}px) translate(-50%, -50%)`
      label.style.opacity = visible ? String(1 - projected.z) : '0'
    })
  }

  const stopFitting = fitToCanvas((width, height) => {
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    drawn = -1
  })

  return {
    render: () => {
      const progress = progressRef.current
      if (progress === drawn) return
      drawn = progress
      const along = progress * CAMERA_TRAVEL
      camera.position.copy(curve.getPointAt(along))
      camera.lookAt(curve.getPointAt(along + LOOK_AHEAD))
      camera.updateMatrixWorld()
      placeLabels()
      renderer.render(scene, camera)
    },
    dispose: () => {
      stopFitting()
      geometry.dispose()
      material.dispose()
    },
  }
}

export function Pipeline3D({ stages, progress, className }: Pipeline3DProps) {
  const progressRef = useProgressRef(progress)
  const labelsRef = useRef<HTMLDivElement | null>(null)
  const stageCount = stages.length
  const build = useCallback(
    (context: SceneContext) =>
      buildPipeline(
        context,
        stageCount,
        Array.from(labelsRef.current?.children ?? []).filter(
          (child): child is HTMLElement => child instanceof HTMLElement,
        ),
        progressRef,
      ),
    [stageCount, progressRef],
  )

  return (
    <div className={className} aria-hidden="true">
      <SceneRuntime className="absolute inset-0" fallback={null} build={build} />
      <div
        ref={labelsRef}
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {stages.map((stage) => (
          <span
            key={stage}
            className="absolute top-0 left-0 font-mono text-xs text-muted opacity-0"
          >
            {stage}
          </span>
        ))}
      </div>
    </div>
  )
}
