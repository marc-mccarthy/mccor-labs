'use client'

import { useReducedMotion } from '../motion/useReducedMotion'
import { useScrollDrawn } from './useScrollDrawn'

export interface WorkflowStep {
  label: string
  gate?: 'human' | 'cost'
}

interface WorkflowDiagramProps {
  steps: readonly WorkflowStep[]
  description: string
}

const STEP_GAP = 160
const NODE_RADIUS = 20
const GATE_SIZE = 24
const DIAGRAM_HEIGHT = 56

const GATE_LABEL: Record<'human' | 'cost', string> = {
  human: 'Human approval gate',
  cost: 'Cost gate',
}

const GATE_STROKE: Record<'human' | 'cost', string> = {
  human: 'var(--color-brand)',
  cost: 'var(--color-accent-hover)',
}

export function WorkflowDiagram({ steps, description }: WorkflowDiagramProps) {
  const reducedMotion = useReducedMotion()
  const { ref, dashOffset } = useScrollDrawn(reducedMotion)
  const width = steps.length * STEP_GAP
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
        {steps.map((step, index) =>
          index === 0 ? null : (
            <path
              key={step.label}
              d={`M${String((index - 1) * STEP_GAP + STEP_GAP / 2)} ${String(midY)} L${String(index * STEP_GAP + STEP_GAP / 2)} ${String(midY)}`}
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
        {steps.map((step, index) => {
          const cx = index * STEP_GAP + STEP_GAP / 2
          if (!step.gate) {
            return (
              <circle
                key={step.label}
                cx={cx}
                cy={midY}
                r={NODE_RADIUS}
                fill="var(--color-surface)"
                stroke="var(--color-accent)"
                strokeWidth={2}
              />
            )
          }
          return (
            <rect
              key={step.label}
              x={cx - GATE_SIZE / 2}
              y={midY - GATE_SIZE / 2}
              width={GATE_SIZE}
              height={GATE_SIZE}
              transform={
                step.gate === 'human'
                  ? `rotate(45 ${String(cx)} ${String(midY)})`
                  : undefined
              }
              fill="var(--color-surface)"
              stroke={GATE_STROKE[step.gate]}
              strokeWidth={2}
            />
          )
        })}
      </svg>
      <ol className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-muted sm:flex sm:justify-between">
        {steps.map((step) => (
          <li key={step.label}>
            <p>{step.label}</p>
            {step.gate ? <p>{GATE_LABEL[step.gate]}</p> : null}
          </li>
        ))}
      </ol>
    </figure>
  )
}
