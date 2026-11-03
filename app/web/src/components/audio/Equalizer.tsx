'use client'

import { useEffect, useRef } from 'react'
import { useMotionPausedFlag } from '@/components/motion/MotionPauseProvider'
import { useMediaQuery, useReducedMotion } from '@/components/motion/useReducedMotion'
import { cn } from '@/lib/cn'

export type EqualizerState = 'idle' | 'playing' | 'muted'

export const BAR_COUNT = 16
export const FLOOR = 0.12
export const LOW_HZ = 60
export const HIGH_HZ = 6000
export const SILENCE_DB = -120
export const SWING_DB = 16
export const CENTER = 0.5
export const MEAN_RATE = 0.04
export const HIDDEN_WIDTHS = '(width < 375px), (48rem <= width < 900px)'
export const REST = Array.from(
  { length: BAR_COUNT },
  (_, i) => 0.3 + 0.4 * Math.abs(Math.sin(i * 1.3)),
)

const PHONE_STRIDE = 3
const FFT_SIZE = 1024
const SMOOTHING = 0.75
const BREATHE_MS = 2400
const BREATHE_DEPTH = 0.35
const BREATHE_PHASE = 0.45

type Band = readonly [number, number]

export function createAnalyser(context: BaseAudioContext): AnalyserNode {
  const analyser = context.createAnalyser()
  analyser.fftSize = FFT_SIZE
  analyser.smoothingTimeConstant = SMOOTHING
  return analyser
}

export function bandEdges(
  binCount: number,
  sampleRate: number,
  bands = BAR_COUNT,
): Band[] {
  const binHz = sampleRate / 2 / binCount
  const edge = (i: number) =>
    Math.round((LOW_HZ * (HIGH_HZ / LOW_HZ) ** (i / bands)) / binHz)
  const edges: Band[] = []
  let from = Math.min(Math.max(1, edge(0)), binCount - 1)
  for (let i = 0; i < bands; i++) {
    const to = Math.min(binCount, Math.max(from + 1, edge(i + 1)))
    edges.push([from, to])
    from = Math.min(to, binCount - 1)
  }
  return edges
}

export function bandDecibels(data: Float32Array, [from, to]: Band): number {
  let sum = 0
  for (let i = from; i < to; i++) sum += data[i] ?? -Infinity
  return sum / (to - from)
}

export function levelAround(decibels: number, mean: number): number {
  return Math.min(1, Math.max(FLOOR, CENTER + (decibels - mean) / SWING_DB))
}

function breathe(time: number, i: number): number {
  const wave = 0.5 + 0.5 * Math.sin((time / BREATHE_MS) * 2 * Math.PI + i * BREATHE_PHASE)
  return 1 - BREATHE_DEPTH * wave
}

function staticLevel(state: EqualizerState, i: number): number {
  return state === 'muted' ? FLOOR : (REST[i] ?? FLOOR)
}

function clip(level: number): string {
  return `inset(${((1 - level) * 100).toFixed(1)}% 0 0 0 round 1.5px)`
}

function setLevel(bar: HTMLSpanElement | null | undefined, level: number): void {
  if (bar) bar.style.clipPath = clip(level)
}

interface EqualizerProps {
  state: EqualizerState
  analyser: AnalyserNode | null
}

export function Equalizer({ state, analyser }: EqualizerProps) {
  const reducedMotion = useReducedMotion()
  const motionPaused = useMotionPausedFlag()
  const hidden = useMediaQuery(HIDDEN_WIDTHS)
  const barsRef = useRef<(HTMLSpanElement | null)[]>([])
  const still = reducedMotion || motionPaused || hidden

  useEffect(() => {
    const bars = barsRef.current
    bars.forEach((bar, i) => {
      setLevel(bar, staticLevel(state, i))
    })
    if (still || state === 'muted') return
    if (state === 'playing' && !analyser) return
    const data = analyser ? new Float32Array(analyser.frequencyBinCount) : null
    const edges = analyser
      ? bandEdges(analyser.frequencyBinCount, analyser.context.sampleRate)
      : []
    const means: number[] = []
    let frame = requestAnimationFrame(function draw(time) {
      if (state === 'playing' && analyser && data) {
        analyser.getFloatFrequencyData(data)
        edges.forEach((band, i) => {
          const decibels = bandDecibels(data, band)
          if (decibels < SILENCE_DB) {
            setLevel(bars[i], FLOOR)
            return
          }
          const mean = means[i] ?? decibels
          means[i] = mean + (decibels - mean) * MEAN_RATE
          setLevel(bars[i], levelAround(decibels, mean))
        })
      } else {
        REST.forEach((rest, i) => {
          setLevel(bars[i], rest * breathe(time, i))
        })
      }
      frame = requestAnimationFrame(draw)
    })
    return () => {
      cancelAnimationFrame(frame)
    }
  }, [state, analyser, still])

  return (
    <div
      aria-hidden="true"
      data-state={state}
      className="flex h-6 shrink-0 items-end gap-0.75 max-[375px]:hidden max-md:gap-0.5 md:max-[900px]:hidden"
    >
      {REST.map((_, i) => (
        <span
          key={i}
          ref={(bar) => {
            barsRef.current[i] = bar
          }}
          style={{ clipPath: clip(staticLevel(state, i)) }}
          className={cn(
            'h-full w-1 rounded-full max-md:w-0.75',
            i % PHONE_STRIDE !== 0 && 'max-md:hidden',
            state === 'playing'
              ? 'bg-linear-to-t from-crimson to-amber'
              : 'bg-border-strong',
          )}
        />
      ))}
    </div>
  )
}
