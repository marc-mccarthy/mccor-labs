'use client'

import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { useReducedMotion } from '../motion/useReducedMotion'
import { useScrollDrawn } from './useScrollDrawn'

interface PipelineDiagramProps {
  stages: readonly string[]
  description: string
  activeIndex?: number
  descriptors?: readonly string[]
}

type StageState = 'pending' | 'passed'

export const STAGE_GAP = 160
const ROW_HEIGHT = 64
const NODE_RADIUS = 20
const TINT_RADIUS = NODE_RADIUS - 1
export const DIAGRAM_HEIGHT = 56
export const PACKET_START = 0.3
export const PACKET_END = 0.65
export const PACKET_LEAD = 0.08

const PASSED_TINT = 'color-mix(in oklab, var(--color-brand) 20%, transparent)'
const SCRUB_TRANSITION =
  'motion-on:transition-[stroke,stroke-dashoffset,opacity] motion-on:duration-(--duration-pointer) motion-on:ease-(--ease-standard)'

export function packetAlong(progress: number): number {
  const span = (progress - PACKET_START) / (PACKET_END - PACKET_START)
  const travel = Math.min(1, Math.max(0, span))
  return -PACKET_LEAD + travel * (1 + 2 * PACKET_LEAD)
}

export function stageIndexAt(progress: number, count: number): number {
  const reached = Math.floor(packetAlong(progress) * (count - 1))
  return Math.min(count - 1, Math.max(-1, reached))
}

type Place = (index: number) => [number, number]

const horizontal: Place = (index) => [
  index * STAGE_GAP + STAGE_GAP / 2,
  DIAGRAM_HEIGHT / 2,
]
const vertical: Place = (index) => [
  DIAGRAM_HEIGHT / 2,
  index * ROW_HEIGHT + ROW_HEIGHT / 2,
]

function scrubEdgeStyle(state: StageState): CSSProperties {
  return { strokeDashoffset: state === 'passed' ? 0 : 1 }
}

function scrubNodeStyle(state: StageState): CSSProperties {
  return {
    stroke: state === 'passed' ? 'var(--color-brand)' : 'var(--color-border-strong)',
  }
}

export function PipelineDiagram({
  stages,
  description,
  activeIndex,
  descriptors,
}: PipelineDiagramProps) {
  const reducedMotion = useReducedMotion()
  const scrubbed = activeIndex !== undefined
  const { ref, edgeStyle, nodeStroke } = useScrollDrawn(reducedMotion || scrubbed)
  const reached = reducedMotion ? stages.length - 1 : activeIndex
  const stateOf = (index: number): StageState | undefined => {
    if (!scrubbed || reached === undefined) return undefined
    return index <= reached ? 'passed' : 'pending'
  }

  const tints = (place: Place) =>
    stages.map((stage, index) => {
      const [cx, cy] = place(index)
      return (
        <rect
          key={stage}
          data-stage-tint=""
          x={cx - TINT_RADIUS}
          y={cy - TINT_RADIUS}
          width={TINT_RADIUS * 2}
          height={TINT_RADIUS * 2}
          rx={TINT_RADIUS}
          className={SCRUB_TRANSITION}
          style={{ fill: PASSED_TINT, opacity: stateOf(index) === 'passed' ? 1 : 0 }}
        />
      )
    })

  const shapes = (place: Place) => (
    <>
      {stages.map((stage, index) => {
        if (index === 0) return null
        const [x1, y1] = place(index - 1)
        const [x2, y2] = place(index)
        const state = stateOf(index)
        return (
          <path
            key={stage}
            d={`M${String(x1)} ${String(y1)} L${String(x2)} ${String(y2)}`}
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth={2}
            pathLength={1}
            strokeDasharray={1}
            className={state ? SCRUB_TRANSITION : undefined}
            style={state ? scrubEdgeStyle(state) : edgeStyle(index - 1)}
          />
        )
      })}
      {stages.map((stage, index) => {
        const [cx, cy] = place(index)
        const state = stateOf(index)
        return (
          <circle
            key={stage}
            cx={cx}
            cy={cy}
            r={NODE_RADIUS}
            fill="var(--color-surface)"
            strokeWidth={2}
            className={state ? SCRUB_TRANSITION : undefined}
            style={state ? scrubNodeStyle(state) : nodeStroke(index)}
          />
        )
      })}
      {scrubbed ? tints(place) : null}
    </>
  )

  return (
    <figure className="relative flex gap-4 sm:block">
      <svg
        ref={ref}
        role="img"
        viewBox={`0 0 ${String(stages.length * STAGE_GAP)} ${String(DIAGRAM_HEIGHT)}`}
        className="w-full overflow-visible max-sm:pointer-events-none max-sm:absolute max-sm:inset-0 max-sm:h-full max-sm:opacity-0"
      >
        <title>{description}</title>
        <desc>{description}</desc>
        {shapes(horizontal)}
      </svg>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${String(DIAGRAM_HEIGHT)} ${String(stages.length * ROW_HEIGHT)}`}
        className="w-14 shrink-0 overflow-visible sm:hidden"
        style={{ height: `${String(stages.length * 4)}rem` }}
      >
        {shapes(vertical)}
      </svg>
      <ol
        className="flex flex-col font-mono text-xs text-muted sm:mt-2 sm:grid sm:text-center"
        style={{
          gridTemplateColumns: `repeat(${String(stages.length)}, minmax(0, 1fr))`,
        }}
      >
        {stages.map((stage, index) => {
          const state = stateOf(index)
          const descriptor = descriptors?.[index]
          return (
            <li
              key={stage}
              data-stage-state={state}
              className={
                descriptor
                  ? 'max-sm:flex max-sm:h-16 max-sm:flex-col max-sm:justify-center'
                  : 'max-sm:flex max-sm:h-16 max-sm:items-center'
              }
            >
              {stage}
              {descriptor ? (
                <span
                  data-stage-descriptor=""
                  className={cn(
                    'block sm:mt-1',
                    state === 'pending' &&
                      'opacity-0 motion-reduce:opacity-100 max-sm:opacity-100',
                  )}
                >
                  {descriptor}
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </figure>
  )
}
