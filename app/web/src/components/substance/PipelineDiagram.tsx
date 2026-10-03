'use client'

import { useReducedMotion } from '../motion/useReducedMotion'
import { useScrollDrawn } from './useScrollDrawn'

interface PipelineDiagramProps {
  stages: readonly string[]
  description: string
}

const STAGE_GAP = 160
const NODE_RADIUS = 20
const DIAGRAM_HEIGHT = 56

export function PipelineDiagram({ stages, description }: PipelineDiagramProps) {
  const reducedMotion = useReducedMotion()
  const { ref, dashOffset } = useScrollDrawn(reducedMotion)
  const width = stages.length * STAGE_GAP
  const midY = DIAGRAM_HEIGHT / 2

  return (
    <figure>
      <svg
        ref={ref}
        role="img"
        viewBox={`0 0 ${String(width)} ${String(DIAGRAM_HEIGHT)}`}
        className="w-full overflow-visible"
      >
        <title>{description}</title>
        <desc>{description}</desc>
        {stages.map((stage, index) =>
          index === 0 ? null : (
            <path
              key={stage}
              d={`M${String((index - 1) * STAGE_GAP + STAGE_GAP / 2)} ${String(midY)} L${String(index * STAGE_GAP + STAGE_GAP / 2)} ${String(midY)}`}
              fill="none"
              stroke="var(--color-border-strong)"
              strokeWidth={2}
              pathLength={1}
              strokeDasharray={1}
              style={{
                strokeDashoffset: dashOffset,
                transition:
                  'stroke-dashoffset var(--duration-scene) var(--ease-standard)',
              }}
            />
          ),
        )}
        {stages.map((stage, index) => (
          <circle
            key={stage}
            cx={index * STAGE_GAP + STAGE_GAP / 2}
            cy={midY}
            r={NODE_RADIUS}
            fill="var(--color-surface)"
            stroke="var(--color-accent)"
            strokeWidth={2}
          />
        ))}
      </svg>
      <ol className="mt-2 flex justify-between font-mono text-xs text-muted">
        {stages.map((stage) => (
          <li key={stage}>{stage}</li>
        ))}
      </ol>
    </figure>
  )
}
