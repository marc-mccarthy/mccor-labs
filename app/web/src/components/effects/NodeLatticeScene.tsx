'use client'

import { useCallback, type ReactNode } from 'react'
import {
  buildNodeLayout,
  HEADLINE_CLEAR_MIN_X,
  LATTICE_SEED,
  NODE_COUNT,
} from './nodeLattice'
import { SceneRuntime, type SceneContext, type SceneHandle } from './SceneRuntime'
import { useProgressRef } from './useProgressRef'

export interface NodeLatticeSceneProps {
  progress: number
  className?: string
  fallback?: ReactNode
}

const NODE_RADIUS = 0.07
const FIELD_OF_VIEW = 50
const CAMERA_Z_FAR = 10
const CAMERA_Z_NEAR = 7
const YAW_SWING = 0.5
const PULSE_START = -0.2
const PULSE_TRAVEL = 1.4
const LG_QUERY = '(min-width: 1024px)'
const VELOCITY_STRETCH = 0.12

const VERTEX_SHADER = `
uniform float uProgress;
uniform float uMinX;
uniform float uRangeX;
varying float vPulse;

void main() {
  vec4 local = vec4(position, 1.0);
  #ifdef USE_INSTANCING
  local = instanceMatrix * local;
  #endif
  float sweep = (local.x - uMinX) / uRangeX;
  float distanceToFront = (sweep - (uProgress * ${PULSE_TRAVEL.toFixed(1)} + (${PULSE_START.toFixed(1)}))) / 0.12;
  vPulse = exp(-distanceToFront * distanceToFront);
  gl_Position = projectionMatrix * modelViewMatrix * local;
}
`

const FRAGMENT_SHADER = `
uniform vec3 uColorRed;
uniform vec3 uColorOrange;
uniform float uOpacity;
varying float vPulse;

void main() {
  vec3 color = mix(uColorRed, uColorOrange, vPulse);
  gl_FragColor = vec4(color, uOpacity * (0.25 + 0.75 * vPulse));
}
`

function buildLattice(
  context: SceneContext,
  progressRef: { current: number },
): SceneHandle {
  const { THREE, renderer, color, fitToCanvas, velocityRef } = context
  const layout = buildNodeLayout(
    LATTICE_SEED,
    NODE_COUNT,
    window.matchMedia(LG_QUERY).matches ? HEADLINE_CLEAR_MIN_X : undefined,
  )

  const uniforms = {
    uProgress: { value: 0 },
    uOpacity: { value: 0 },
    uMinX: { value: layout.minX },
    uRangeX: { value: layout.rangeX },
    uColorRed: { value: color('--color-glow-red') },
    uColorOrange: { value: color('--color-glow-orange') },
  }
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const nodeGeometry = new THREE.IcosahedronGeometry(NODE_RADIUS, 0)
  const nodes = new THREE.InstancedMesh(nodeGeometry, material, NODE_COUNT)
  const placement = new THREE.Matrix4()
  for (let i = 0; i < NODE_COUNT; i++) {
    placement.setPosition(
      layout.positions[i * 3] ?? 0,
      layout.positions[i * 3 + 1] ?? 0,
      layout.positions[i * 3 + 2] ?? 0,
    )
    nodes.setMatrixAt(i, placement)
  }
  nodes.frustumCulled = false

  const edgeGeometry = new THREE.BufferGeometry()
  edgeGeometry.setAttribute('position', new THREE.BufferAttribute(layout.positions, 3))
  edgeGeometry.setIndex(new THREE.BufferAttribute(layout.edges, 1))
  const edges = new THREE.LineSegments(edgeGeometry, material)
  edges.frustumCulled = false

  const group = new THREE.Group()
  group.add(nodes, edges)
  const scene = new THREE.Scene()
  scene.add(group)
  const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 50)

  let drawn = -1
  let drawnVelocity = 0

  const stopFitting = fitToCanvas((width, height) => {
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    drawn = -1
  })

  return {
    render: () => {
      const progress = progressRef.current
      const velocity = velocityRef.current
      if (progress === drawn && velocity === drawnVelocity) return
      drawn = progress
      drawnVelocity = velocity
      uniforms.uProgress.value = progress
      uniforms.uOpacity.value = Math.sin(Math.PI * progress)
      camera.position.z = CAMERA_Z_FAR + (CAMERA_Z_NEAR - CAMERA_Z_FAR) * progress
      group.rotation.y = (progress - 0.5) * YAW_SWING
      group.scale.y = 1 + Math.abs(velocity) * VELOCITY_STRETCH
      renderer.render(scene, camera)
    },
    dispose: () => {
      stopFitting()
      nodeGeometry.dispose()
      edgeGeometry.dispose()
      material.dispose()
      nodes.dispose()
    },
  }
}

export function NodeLatticeScene({
  progress,
  className,
  fallback = null,
}: NodeLatticeSceneProps) {
  const progressRef = useProgressRef(progress)
  const build = useCallback(
    (context: SceneContext) => buildLattice(context, progressRef),
    [progressRef],
  )
  return <SceneRuntime className={className} fallback={fallback} build={build} />
}
