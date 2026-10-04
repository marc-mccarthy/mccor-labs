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
const ROW_HEIGHT = 64
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

type Place = (index: number) => [number, number]

const horizontal: Place = (index) => [index * STEP_GAP + STEP_GAP / 2, DIAGRAM_HEIGHT / 2]
const vertical: Place = (index) => [
  DIAGRAM_HEIGHT / 2,
  index * ROW_HEIGHT + ROW_HEIGHT / 2,
]

export function WorkflowDiagram({ steps, description }: WorkflowDiagramProps) {
  const reducedMotion = useReducedMotion()
  const { ref, dashOffset } = useScrollDrawn(reducedMotion)

  const shapes = (place: Place) => (
    <>
      {steps.map((step, index) => {
        if (index === 0) return null
        const [x1, y1] = place(index - 1)
        const [x2, y2] = place(index)
        return (
          <path
            key={step.label}
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
      {steps.map((step, index) => {
        const [cx, cy] = place(index)
        if (!step.gate) {
          return (
            <circle
              key={step.label}
              cx={cx}
              cy={cy}
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
            y={cy - GATE_SIZE / 2}
            width={GATE_SIZE}
            height={GATE_SIZE}
            transform={
              step.gate === 'human' ? `rotate(45 ${String(cx)} ${String(cy)})` : undefined
            }
            fill="var(--color-surface)"
            stroke={GATE_STROKE[step.gate]}
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
        viewBox={`0 0 ${String(steps.length * STEP_GAP)} ${String(DIAGRAM_HEIGHT)}`}
        className="w-full overflow-visible max-sm:absolute max-sm:inset-0 max-sm:h-full max-sm:opacity-0"
      >
        <title>{description}</title>
        <desc>{description}</desc>
        {shapes(horizontal)}
      </svg>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${String(DIAGRAM_HEIGHT)} ${String(steps.length * ROW_HEIGHT)}`}
        className="w-14 shrink-0 overflow-visible sm:hidden"
        style={{ height: `${String(steps.length * 4)}rem` }}
      >
        {shapes(vertical)}
      </svg>
      <ol className="flex flex-col font-mono text-xs text-muted sm:mt-2 sm:flex-row sm:justify-between">
        {steps.map((step) => (
          <li
            key={step.label}
            className="max-sm:flex max-sm:h-16 max-sm:flex-col max-sm:justify-center"
          >
            <p>{step.label}</p>
            {step.gate ? <p className="max-sm:pl-4">{GATE_LABEL[step.gate]}</p> : null}
          </li>
        ))}
      </ol>
    </figure>
  )
}
