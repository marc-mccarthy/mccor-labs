'use client'

import type { ReactNode } from 'react'

import { Reveal } from '@/components/motion/Reveal'
import { readDurationSeconds } from '@/components/motion/tokens'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { signOffCopy, verdictCopy } from '@/content/lab/copy'
import type { RubricResult, StepAnswers } from '@/content/lab/rubric'
import { cn } from '@/lib/cn'

import { VERDICT_STYLE } from './verdictStyle'
import { WhyDrawer } from './WhyDrawer'

const MAX_STAGGER_STEPS = 3

let cachedStagger: number | undefined

function staggerInterval(): number {
  if (cachedStagger === undefined && typeof window !== 'undefined') {
    cachedStagger = readDurationSeconds('--stagger-interval')
  }
  return cachedStagger ?? Number.NaN
}

export interface VerdictCardProps {
  readonly position: number
  readonly name: string
  readonly result: RubricResult
  readonly answers: StepAnswers
  readonly snippet: ReactNode
  readonly revealOrder: number
}

export function VerdictCard({
  position,
  name,
  result,
  answers,
  snippet,
  revealOrder,
}: VerdictCardProps) {
  const { verdict, humanSignOff } = result
  const style = VERDICT_STYLE[verdict]

  return (
    <Card className={cn('mt-4', style.card)}>
      {style.cardRule ? <span aria-hidden="true" className={style.cardRule} /> : null}
      <Reveal delay={Math.min(revealOrder, MAX_STAGGER_STEPS) * staggerInterval()}>
        <div
          key={`${verdict}-${String(humanSignOff)}`}
          data-verdict-block
          className="motion-safe:transition-opacity motion-safe:duration-(--duration-pointer) motion-safe:ease-(--ease-pointer) motion-safe:starting:opacity-0"
        >
          <h4 className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge variant={verdict}>
              <span aria-hidden="true" className={style.marker} />
              {verdictCopy[verdict].label}
            </Badge>
            {humanSignOff ? (
              <span className="text-sm text-text">{signOffCopy}</span>
            ) : null}
          </h4>
          <p className="text-sm text-muted">{verdictCopy[verdict].gloss}</p>
        </div>
      </Reveal>
      <WhyDrawer
        position={position}
        name={name}
        result={result}
        answers={answers}
        snippet={snippet}
      />
    </Card>
  )
}
