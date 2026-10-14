'use client'

import { motionValue, type MotionValue } from 'motion/react'
import { useCallback } from 'react'
import {
  BAND,
  buildPacketFlags,
  buildParticles,
  PACKET_COUNT,
  PACKET_END,
  PACKET_GATHER,
  PACKET_LEAD,
  PACKET_START,
  PACKET_TAIL,
  PARTICLE_COUNT,
  PIPELINE_SEED,
  ROW_CENTER,
} from './pipelinePath'
import { SceneRuntime, type SceneContext, type SceneHandle } from './SceneRuntime'
import { useProgressRef } from './useProgressRef'

export interface Pipeline3DProps {
  stages: readonly string[]
  progress?: MotionValue<number>
  className?: string
}

const OPACITY = 0.7
const HALO = 0.22
const HALO_SIZE = 16
const CORE = 0.14
const IDLE_PROGRESS = motionValue(0)

const glsl = (value: number) => value.toFixed(4)

const VERTEX_SHADER = `
uniform float uTime;
uniform float uStages;
uniform float uPixelRatio;
uniform float uProgress;
attribute float aPacket;
varying float vFade;
varying float vHalo;

void main() {
  float along = fract(position.x + uTime * (0.02 + 0.03 * position.z));
  float travel = clamp((uProgress - ${glsl(PACKET_START)}) / ${glsl(PACKET_END - PACKET_START)}, 0.0, 1.0);
  float head = -${glsl(PACKET_LEAD)} + travel * ${glsl(1 + 2 * PACKET_LEAD)};
  float gather = aPacket * smoothstep(${glsl(PACKET_START - PACKET_GATHER)}, ${glsl(PACKET_START)}, uProgress) * (1.0 - smoothstep(${glsl(PACKET_END)}, ${glsl(PACKET_END + PACKET_GATHER)}, uProgress));
  float trail = position.x * position.x;
  float wobble = sin(uTime * 3.0 + position.x * 40.0);
  vec2 drift = vec2(0.5 + along * (uStages - 1.0), -(${glsl(ROW_CENTER)} + position.y * ${glsl(BAND)}));
  vec2 packet = vec2(0.5 + head * (uStages - 1.0) - trail * ${glsl(PACKET_TAIL)}, -(${glsl(ROW_CENTER)} + (position.y * (1.0 - trail) + 0.2 * wobble) * ${glsl(BAND / 2)}));
  vFade = mix(sin(3.14159 * along), 1.0, gather);
  vHalo = gather;
  gl_PointSize = mix(2.0 + 2.5 * position.z, ${glsl(HALO_SIZE)}, gather) * uPixelRatio;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(mix(drift, packet, gather), 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uHalo;
varying float vFade;
varying float vHalo;

void main() {
  float spread = length(gl_PointCoord - 0.5);
  float radius = mix(0.5, ${glsl(CORE)}, vHalo);
  float core = smoothstep(radius, radius * 0.3, spread);
  float halo = uHalo * vHalo * exp(-spread * spread * 16.0) * smoothstep(0.5, 0.3, spread);
  float strength = mix(uOpacity, 1.0, vHalo);
  gl_FragColor = vec4(uColor, min(1.0, strength * vFade * core + halo));
}
`

function buildPipeline(
  context: SceneContext,
  stageCount: number,
  progressRef: { readonly current: number },
): SceneHandle {
  const { THREE, renderer, pixelRatioRef, color, fitToCanvas } = context
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(buildParticles(PIPELINE_SEED, PARTICLE_COUNT), 3),
  )
  geometry.setAttribute(
    'aPacket',
    new THREE.BufferAttribute(buildPacketFlags(PARTICLE_COUNT, PACKET_COUNT), 1),
  )
  const uniforms = {
    uTime: { value: 0 },
    uStages: { value: stageCount },
    uPixelRatio: { value: pixelRatioRef.current },
    uProgress: { value: progressRef.current },
    uColor: { value: color('--color-accent') },
    uOpacity: { value: OPACITY },
    uHalo: { value: HALO },
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
      uniforms.uProgress.value = progressRef.current
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
  const stageCount = stages.length
  const progressRef = useProgressRef(progress ?? IDLE_PROGRESS)
  const build = useCallback(
    (context: SceneContext) => buildPipeline(context, stageCount, progressRef),
    [stageCount, progressRef],
  )

  return (
    <div className={className} aria-hidden="true">
      <SceneRuntime className="absolute inset-0" fallback={null} build={build} />
    </div>
  )
}
