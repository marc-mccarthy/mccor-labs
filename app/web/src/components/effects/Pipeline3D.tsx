'use client'

import { useCallback } from 'react'
import {
  BAND,
  buildParticles,
  PARTICLE_COUNT,
  PIPELINE_SEED,
  ROW_CENTER,
} from './pipelinePath'
import { SceneRuntime, type SceneContext, type SceneHandle } from './SceneRuntime'

export interface Pipeline3DProps {
  stages: readonly string[]
  className?: string
}

const OPACITY = 0.7

const VERTEX_SHADER = `
uniform float uTime;
uniform float uStages;
uniform float uPixelRatio;
varying float vFade;

void main() {
  float along = fract(position.x + uTime * (0.02 + 0.03 * position.z));
  vFade = sin(3.14159 * along);
  vec3 place = vec3(0.5 + along * (uStages - 1.0), -(${ROW_CENTER.toFixed(4)} + position.y * ${BAND.toFixed(4)}), 0.0);
  gl_PointSize = (2.0 + 2.5 * position.z) * uPixelRatio;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(place, 1.0);
}
`

const FRAGMENT_SHADER = `
uniform vec3 uColor;
uniform float uOpacity;
varying float vFade;

void main() {
  float edge = smoothstep(0.5, 0.15, length(gl_PointCoord - 0.5));
  gl_FragColor = vec4(uColor, uOpacity * vFade * edge);
}
`

function buildPipeline(context: SceneContext, stageCount: number): SceneHandle {
  const { THREE, renderer, pixelRatioRef, color, fitToCanvas } = context
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(buildParticles(PIPELINE_SEED, PARTICLE_COUNT), 3),
  )
  const uniforms = {
    uTime: { value: 0 },
    uStages: { value: stageCount },
    uPixelRatio: { value: pixelRatioRef.current },
    uColor: { value: color('--color-accent') },
    uOpacity: { value: OPACITY },
  }
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  const scene = new THREE.Scene()
  scene.add(points)
  const camera = new THREE.OrthographicCamera(0, stageCount, 0, -1, -1, 1)

  const stopFitting = fitToCanvas((width, height) => {
    camera.bottom = (-height * stageCount) / width
    camera.updateProjectionMatrix()
  })

  return {
    render: (time) => {
      uniforms.uTime.value = time / 1000
      uniforms.uPixelRatio.value = pixelRatioRef.current
      renderer.render(scene, camera)
    },
    dispose: () => {
      stopFitting()
      geometry.dispose()
      material.dispose()
    },
  }
}

export function Pipeline3D({ stages, className }: Pipeline3DProps) {
  const stageCount = stages.length
  const build = useCallback(
    (context: SceneContext) => buildPipeline(context, stageCount),
    [stageCount],
  )

  return (
    <div className={className} aria-hidden="true">
      <SceneRuntime className="absolute inset-0" fallback={null} build={build} />
    </div>
  )
}
