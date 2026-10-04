'use client'

import { useReducedMotion } from '../motion/useReducedMotion'
import { useScrollDrawn } from './useScrollDrawn'

interface PipelineDiagramProps {
  stages: readonly string[]
  description: string
}

const STAGE_GAP = 160
const ROW_HEIGHT = 64
const NODE_RADIUS = 20
const DIAGRAM_HEIGHT = 56

type Place = (index: number) => [number, number]

const horizontal: Place = (index) => [
  index * STAGE_GAP + STAGE_GAP / 2,
  DIAGRAM_HEIGHT / 2,
]
const vertical: Place = (index) => [
  DIAGRAM_HEIGHT / 2,
  index * ROW_HEIGHT + ROW_HEIGHT / 2,
]

export function PipelineDiagram({ stages, description }: PipelineDiagramProps) {
  const reducedMotion = useReducedMotion()
  const { ref, dashOffset } = useScrollDrawn(reducedMotion)

  const shapes = (place: Place) => (
    <>
      {stages.map((stage, index) => {
        if (index === 0) return null
        const [x1, y1] = place(index - 1)
        const [x2, y2] = place(index)
        return (
          <path
            key={stage}
            d={`M${String(x1)} ${String(y1)} L${String(x2)} ${String(y2)}`}
            fill="none"
            stroke="var(--color-border-strong)"
            strokeWidth={2}
            pathLength={1}
            strokeDasharray={1}
            style={{
              strokeDashoffset: dashOffset,
              transition: 'stroke-dashoffset var(--duration-scene) var(--ease-standard)',
            }}
          />
        )
      })}
      {stages.map((stage, index) => {
        const [cx, cy] = place(index)
        return (
          <circle
            key={stage}
            cx={cx}
            cy={cy}
            r={NODE_RADIUS}
            fill="var(--color-surface)"
            stroke="var(--color-brand)"
            strokeWidth={2}
          />
        )
      })}
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
      <ol className="flex flex-col font-mono text-xs text-muted sm:mt-2 sm:flex-row sm:justify-between">
        {stages.map((stage) => (
          <li key={stage} className="max-sm:flex max-sm:h-16 max-sm:items-center">
            {stage}
          </li>
        ))}
      </ol>
    </figure>
  )
}
