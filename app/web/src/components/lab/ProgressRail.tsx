import { fillTemplate, progressCopy, verdictCopy } from '@/content/lab/copy'
import {
  VERDICTS,
  visibleQuestions,
  type RubricResult,
  type StepAnswers,
  type Verdict,
} from '@/content/lab/rubric'

import { VERDICT_STYLE } from './verdictStyle'

export interface ProgressSummary {
  readonly resolved: number
  readonly total: number
  readonly tally: Readonly<Record<Verdict, number>>
}

export function isResolved(answers: StepAnswers): boolean {
  return visibleQuestions(answers).every((key) => answers[key] !== null)
}

export function summarize(
  steps: readonly { readonly answers: StepAnswers; readonly result: RubricResult }[],
): ProgressSummary {
  const tally = Object.fromEntries(VERDICTS.map((verdict) => [verdict, 0])) as Record<
    Verdict,
    number
  >
  for (const step of steps) tally[step.result.verdict] += 1
  return {
    resolved: steps.filter((step) => isResolved(step.answers)).length,
    total: steps.length,
    tally,
  }
}

export function ProgressRail({ resolved, total, tally }: ProgressSummary) {
  const present = VERDICTS.filter((verdict) => tally[verdict] > 0)

  return (
    <div>
      <h2 className="font-display text-2xl">{progressCopy.heading}</h2>
      <p className="mt-2 text-muted">
        {fillTemplate(progressCopy.resolved, { resolved, total })}
      </p>
      <div aria-hidden="true" className="mt-4 h-px w-full bg-border">
        <div
          data-progress-fill
          className="h-px origin-left bg-brand motion-safe:transition-transform motion-safe:duration-(--duration-standard) motion-safe:ease-(--ease-standard)"
          style={{ transform: `scaleX(${String(total === 0 ? 0 : resolved / total)})` }}
        />
      </div>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {present.map((verdict) => (
          <li key={verdict} className="flex items-center gap-2">
            <span aria-hidden="true" className={VERDICT_STYLE[verdict].marker} />
            <span>{verdictCopy[verdict].label}</span>
            <span className="ml-auto font-mono text-muted">{tally[verdict]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
