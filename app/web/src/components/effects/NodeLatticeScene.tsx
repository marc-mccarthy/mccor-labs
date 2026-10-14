'use client'

import type { MotionValue } from 'motion/react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import { useMotionPausedFlag } from '../motion/MotionPauseProvider'
import { readDurationSeconds, readToken } from '../motion/tokens'
import { useReducedMotion } from '../motion/useReducedMotion'
import {
  buildNodeLayout,
  gatesPassed,
  gateThresholds,
  HEADLINE_CLEAR_MIN_X,
  LATTICE_SEED,
  NODE_COUNT,
  stepGateFlash,
} from './nodeLattice'
import { SceneRuntime, type SceneContext, type SceneHandle } from './SceneRuntime'
import { useProgressRef } from './useProgressRef'

export interface NodeLatticeSceneProps {
  progress: MotionValue<number>
  gatePinUnits?: number
  gateListRef?: RefObject<HTMLElement | null>
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
const GATE_FLASH_GAIN = 0.5
const GATE_FLASH_ALPHA = 0.5
const NO_GATES: readonly number[] = []
const GATE_POP_SCALE = 1.8

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
uniform float uGateFlash;
varying float vPulse;

void main() {
  vec3 color = mix(uColorRed, uColorOrange, vPulse);
  float flare = vPulse * uGateFlash;
  vec3 lit = color + uColorOrange * flare * ${GATE_FLASH_GAIN.toFixed(2)};
  gl_FragColor = vec4(lit, uOpacity * (0.25 + 0.75 * vPulse + flare * ${GATE_FLASH_ALPHA.toFixed(2)}));
}
`

function popDot(gate: HTMLElement): void {
  gate
    .querySelector('[data-gate-dot]')
    ?.animate([{ scale: '1' }, { scale: String(GATE_POP_SCALE) }, { scale: '1' }], {
      duration: readDurationSeconds('--duration-standard') * 1000,
      easing: readToken('--ease-standard'),
    })
}

function writeGateStates(
  gates: readonly HTMLElement[],
  passed: number,
  pop: boolean,
): void {
  gates.forEach((gate, index) => {
    const next = index < passed ? 'passed' : 'pending'
    if (gate.dataset.state === next) return
    gate.dataset.state = next
    if (pop && next === 'passed') popDot(gate)
  })
}

export function useLatticeGates(
  progress: MotionValue<number>,
  pinUnits: number | undefined,
  listRef: RefObject<HTMLElement | null> | undefined,
): readonly number[] {
  const reducedMotion = useReducedMotion()
  const paused = useMotionPausedFlag()
  const pausedRef = useRef(paused)
  const thresholds = useMemo(
    () => (pinUnits === undefined ? NO_GATES : gateThresholds(pinUnits)),
    [pinUnits],
  )

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    const list = listRef?.current
    if (reducedMotion || !list) return undefined
    const gates = [...list.querySelectorAll<HTMLElement>('[data-gate]')]
    let shown = -1
    let armed = false
    const arming = requestAnimationFrame(() => {
      armed = true
    })
    const write = (value: number) => {
      const passed = gatesPassed(value, thresholds)
      if (passed === shown) return
      writeGateStates(gates, passed, armed && !pausedRef.current)
      shown = passed
    }
    write(progress.get())
    const stop = progress.on('change', write)
    return () => {
      cancelAnimationFrame(arming)
      stop()
    }
  }, [listRef, progress, reducedMotion, thresholds])

  return thresholds
}

function buildLattice(
  context: SceneContext,
  progressRef: { current: number },
  gates: readonly number[],
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
    uGateFlash: { value: 0 },
    uMinX: { value: layout.minX },
    uRangeX: { value: layout.rangeX },
    uColorRed: { value: color('--color-glow-red') },
    uColorOrange: { value: color('--color-accent') },
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
  let drawnFlash = 0
  let flash = 0
  let passed = gatesPassed(progressRef.current, gates)
  let lastTime: number | null = null

  const stopFitting = fitToCanvas((width, height) => {
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    drawn = -1
  })

  return {
    render: (time) => {
      const progress = progressRef.current
      const velocity = velocityRef.current
      const delta = lastTime === null ? 0 : time - lastTime
      lastTime = time
      const nowPassed = gatesPassed(progress, gates)
      flash = stepGateFlash(flash, passed, nowPassed, delta)
      passed = nowPassed
      if (progress === drawn && velocity === drawnVelocity && flash === drawnFlash) return
      drawn = progress
      drawnVelocity = velocity
      drawnFlash = flash
      uniforms.uGateFlash.value = flash
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
  gatePinUnits,
  gateListRef,
  className,
  fallback = null,
}: NodeLatticeSceneProps) {
  const progressRef = useProgressRef(progress)
  const gates = useLatticeGates(progress, gatePinUnits, gateListRef)
  const build = useCallback(
    (context: SceneContext) => buildLattice(context, progressRef, gates),
    [progressRef, gates],
  )
  return <SceneRuntime className={className} fallback={fallback} build={build} />
}
