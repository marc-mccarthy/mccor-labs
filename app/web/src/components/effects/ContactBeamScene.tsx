'use client'

import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { usePointerEffects } from '../motion/useReducedMotion'
import {
  beamLayout,
  bendOffset,
  bendPath,
  SAMPLES_PER_SPAN,
  TRAIL_ANCHORS,
  type BeamLayout,
} from './contactBeamPath'
import {
  easeVelocity,
  SceneRuntime,
  type SceneContext,
  type SceneHandle,
} from './SceneRuntime'

export interface ContactBeamSceneProps {
  className?: string
  fallback?: ReactNode
}

interface PointerDrift {
  x: number
  y: number
}

export const PATH_POINTS = TRAIL_ANCHORS.length * SAMPLES_PER_SPAN + 1
export const PACKET_PERIOD_SECONDS = 7
export const PACKET_TRAVEL_SECONDS = 6
export const BREATH_PERIOD_SECONDS = 4

const CORE_WIDTH = 2.2
const HALO_WIDTH = 12
const PACKET_LENGTH = 34
const PACKET_STRETCH = 2.5
const OCCLUDER_SOFTNESS = 6
const LEAD_IN = 0.12
const HALO_REACH = 6
const PACKET_HALO_GAIN = 2.4
const PACKET_RAMP_IN = 0.15
const PACKET_RAMP_OUT = 0.1
const PACKET_HALO_SPREAD = 1.8
const BREATH_BASE = 0.26
const BREATH_SWING = 0.1
const ARRIVAL_GAIN = 0.35
const ARRIVAL_DECAY = 3

const VERTEX_SHADER = `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
uniform vec3 uColorBrand;
uniform vec3 uColorGlowRed;
uniform vec3 uColorAccent;
uniform vec2 uPath[${String(PATH_POINTS)}];
uniform float uArc[${String(PATH_POINTS)}];
uniform vec4 uBounds;
uniform vec3 uOrb;
uniform vec3 uOccluder;
uniform float uPixelRatio;
uniform float uTime;
uniform float uCore;
uniform float uHalo;
uniform float uSoftness;
uniform float uPacket;
uniform float uPacketLength;
uniform float uPacketGain;
uniform float uBloom;

void main() {
  vec2 p = gl_FragCoord.xy / uPixelRatio;
  float dist = 1e6;
  float along = 0.0;
  if (p.x >= uBounds.x && p.x <= uBounds.z && p.y >= uBounds.y && p.y <= uBounds.w) {
    for (int i = 0; i < ${String(PATH_POINTS - 1)}; i++) {
      vec2 a = uPath[i];
      vec2 ab = uPath[i + 1] - a;
      float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
      float d = length(p - a - ab * h);
      if (d < dist) {
        dist = d;
        along = uArc[i] + (uArc[i + 1] - uArc[i]) * h;
      }
    }
  }
  float total = uArc[${String(PATH_POINTS - 1)}];
  float reveal = smoothstep(0.0, total * ${LEAD_IN.toFixed(2)}, along);
  float occluded = smoothstep(uOccluder.z - uSoftness, uOccluder.z + uSoftness, length(p - uOccluder.xy));
  float orbDistance = length(p - uOrb.xy) / uOrb.z;
  float intoOrb = smoothstep(0.35, 1.0, orbDistance);
  float mask = reveal * occluded * intoOrb;
  float core = exp(-(dist * dist) / (uCore * uCore));
  float halo = exp(-dist / uHalo);
  float packetHalo = exp(-dist / (uHalo * ${PACKET_HALO_SPREAD.toFixed(2)}));
  float flow = 0.8 + 0.2 * sin(along / uHalo - uTime * 1.5);
  float packetOffset = (along - uPacket) / uPacketLength;
  float packet = exp(-packetOffset * packetOffset) * uPacketGain * mask;
  float bloom = exp(-orbDistance * orbDistance * 1.4) * uBloom;
  vec3 light = uColorBrand * (core * flow * mask * 0.5)
    + uColorGlowRed * (halo * mask * 0.16)
    + uColorAccent * (packet * (core * 1.4 + packetHalo * ${PACKET_HALO_GAIN.toFixed(2)}))
    + uColorAccent * bloom;
  light = clamp(light, 0.0, 1.0);
  float alpha = max(max(light.r, light.g), light.b);
  gl_FragColor = vec4(light, alpha);
}
`

function easeInOutSine(value: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * value)
}

export function packetState(seconds: number): { progress: number; arrival: number } {
  const phase = seconds % PACKET_PERIOD_SECONDS
  if (phase < PACKET_TRAVEL_SECONDS) {
    return { progress: easeInOutSine(phase / PACKET_TRAVEL_SECONDS), arrival: 0 }
  }
  return {
    progress: 1,
    arrival: Math.exp(-(phase - PACKET_TRAVEL_SECONDS) * ARRIVAL_DECAY),
  }
}

export function packetGain(progress: number): number {
  return Math.max(
    0,
    Math.min(1, progress / PACKET_RAMP_IN, (1 - progress) / PACKET_RAMP_OUT),
  )
}

export function breath(seconds: number): number {
  return (
    BREATH_BASE + BREATH_SWING * Math.sin((2 * Math.PI * seconds) / BREATH_PERIOD_SECONDS)
  )
}

function boundsOf(
  layout: BeamLayout,
  height: number,
  pad: number,
): [number, number, number, number] {
  const xs = layout.path.map((point) => point.x)
  const ys = layout.path.map((point) => height - point.y)
  return [
    Math.min(...xs) - pad,
    Math.min(...ys) - pad,
    Math.max(...xs) + pad,
    Math.max(...ys) + pad,
  ]
}

function buildBeam(context: SceneContext, drift: PointerDrift): SceneHandle {
  const { THREE, renderer, color, fitToCanvas, velocityRef, pixelRatioRef } = context

  const pathValue = Array.from({ length: PATH_POINTS }, () => new THREE.Vector2())
  const arcValue = new Array<number>(PATH_POINTS).fill(0)
  const uniforms = {
    uColorBrand: { value: color('--color-brand') },
    uColorGlowRed: { value: color('--color-glow-red') },
    uColorAccent: { value: color('--color-accent') },
    uPath: { value: pathValue },
    uArc: { value: arcValue },
    uBounds: { value: new THREE.Vector4() },
    uOrb: { value: new THREE.Vector3() },
    uOccluder: { value: new THREE.Vector3() },
    uPixelRatio: { value: pixelRatioRef.current },
    uTime: { value: 0 },
    uCore: { value: CORE_WIDTH },
    uHalo: { value: HALO_WIDTH },
    uSoftness: { value: OCCLUDER_SOFTNESS },
    uPacket: { value: 0 },
    uPacketLength: { value: PACKET_LENGTH },
    uPacketGain: { value: 0 },
    uBloom: { value: BREATH_BASE },
  }
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    blending: THREE.NoBlending,
    depthTest: false,
    depthWrite: false,
  })
  const geometry = new THREE.PlaneGeometry(2, 2)
  const quad = new THREE.Mesh(geometry, material)
  quad.frustumCulled = false
  const scene = new THREE.Scene()
  scene.add(quad)
  const camera = new THREE.Camera()

  let layout: BeamLayout | null = null
  let width = 0
  let height = 0
  let bendX = 0
  let bendY = 0

  const stopFitting = fitToCanvas((nextWidth, nextHeight) => {
    width = nextWidth
    height = nextHeight
    layout = beamLayout(width, height)
    const { scale, arcs, orb, occluder } = layout
    arcs.forEach((arc, index) => {
      arcValue[index] = arc
    })
    const pad =
      HALO_WIDTH * scale * HALO_REACH * PACKET_HALO_SPREAD +
      bendOffset({ x: 1, y: 0 }, width).x
    uniforms.uBounds.value.set(...boundsOf(layout, height, pad))
    uniforms.uOrb.value.set(orb.x, height - orb.y, orb.radius)
    uniforms.uOccluder.value.set(occluder.x, height - occluder.y, occluder.radius)
    uniforms.uCore.value = CORE_WIDTH * scale
    uniforms.uHalo.value = HALO_WIDTH * scale
    uniforms.uSoftness.value = OCCLUDER_SOFTNESS * scale
  })

  return {
    render: (time) => {
      if (!layout) return
      const seconds = time / 1000
      bendX = easeVelocity(bendX, drift.x)
      bendY = easeVelocity(bendY, drift.y)
      drift.x = 0
      drift.y = 0
      const bent = bendPath(
        layout.path,
        layout.weights,
        bendOffset({ x: bendX, y: bendY }, width),
      )
      bent.forEach((point, index) => {
        pathValue[index]?.set(point.x, height - point.y)
      })
      const total = layout.arcs.at(-1) ?? 0
      const { progress, arrival } = packetState(seconds)
      const stretch = 1 + PACKET_STRETCH * Math.abs(velocityRef.current)
      uniforms.uPixelRatio.value = pixelRatioRef.current
      uniforms.uTime.value = seconds
      uniforms.uPacket.value = progress * total
      uniforms.uPacketLength.value = PACKET_LENGTH * layout.scale * stretch
      uniforms.uPacketGain.value = packetGain(progress)
      uniforms.uBloom.value = breath(seconds) + ARRIVAL_GAIN * arrival
      renderer.render(scene, camera)
    },
    dispose: () => {
      stopFitting()
      geometry.dispose()
      material.dispose()
    },
  }
}

export function ContactBeamScene({ className, fallback = null }: ContactBeamSceneProps) {
  const pointerEffects = usePointerEffects()
  const driftRef = useRef<PointerDrift>({ x: 0, y: 0 })

  useEffect(() => {
    if (!pointerEffects) return undefined
    const drift = driftRef.current
    let last: { x: number; y: number } | null = null
    const onMove = (event: PointerEvent) => {
      if (last) {
        drift.x += event.clientX - last.x
        drift.y += event.clientY - last.y
      }
      last = { x: event.clientX, y: event.clientY }
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      drift.x = 0
      drift.y = 0
    }
  }, [pointerEffects])

  const build = useCallback(
    (context: SceneContext) => buildBeam(context, driftRef.current),
    [],
  )
  return (
    <SceneRuntime
      className={cn('mix-blend-screen', className)}
      fallback={fallback}
      build={build}
    />
  )
}
