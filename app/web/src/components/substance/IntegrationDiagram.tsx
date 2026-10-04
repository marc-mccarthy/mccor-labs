'use client'

import { useReducedMotion } from '../motion/useReducedMotion'
import { useScrollDrawn } from './useScrollDrawn'

interface IntegrationDiagramProps {
  surfaces: readonly string[]
  description: string
}

const SURFACE_GAP = 140
const SURFACE_RADIUS = 18
const BOUNDARY_PADDING = 32
const DIAGRAM_HEIGHT = 120

export function IntegrationDiagram({ surfaces, description }: IntegrationDiagramProps) {
  const reducedMotion = useReducedMotion()
  const { ref, dashOffset } = useScrollDrawn(reducedMotion)
  const width = surfaces.length * SURFACE_GAP + BOUNDARY_PADDING * 2
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
        <rect
          x={BOUNDARY_PADDING / 2}
          y={BOUNDARY_PADDING / 2}
          width={width - BOUNDARY_PADDING}
          height={DIAGRAM_HEIGHT - BOUNDARY_PADDING}
          rx={12}
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
        {surfaces.map((surface, index) => (
          <circle
            key={surface}
            cx={BOUNDARY_PADDING + SURFACE_GAP * index + SURFACE_GAP / 2}
            cy={midY}
            r={SURFACE_RADIUS}
            fill="var(--color-surface)"
            stroke="var(--color-border-strong)"
            strokeWidth={2}
          />
        ))}
      </svg>
      <ol className="mt-2 flex justify-between font-mono text-xs text-text">
        {surfaces.map((surface) => (
          <li key={surface}>{surface}</li>
        ))}
      </ol>
    </figure>
  )
}
