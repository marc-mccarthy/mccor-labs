import { labLive } from '@/content/lab/copy'
import type { Frequency } from '@/content/lab/rubric'
import { formatMonthlyUsd, formatUsd, monthlyModelUsd } from '@/lib/labCost'

export interface CostLineProps {
  readonly costUsd: number
  readonly examples?: number
  readonly frequency?: Frequency
  readonly pricesAsOf: string
  readonly runsLeft?: number | null
  readonly recorded: boolean
}

function monthlySentence(
  costUsd: number,
  examples: number | undefined,
  frequency: Frequency | undefined,
): string | null {
  if (examples === undefined || frequency === undefined || frequency === null) {
    return null
  }
  const monthly = monthlyModelUsd(costUsd, examples, frequency)
  if (monthly === null) return null
  return labLive.monthly(frequency, formatMonthlyUsd(monthly).value)
}

export function CostLine({
  costUsd,
  examples,
  frequency,
  pricesAsOf,
  runsLeft,
  recorded,
}: CostLineProps) {
  const cost = formatUsd(costUsd)
  const monthly = monthlySentence(costUsd, examples, frequency)

  return (
    <div className="space-y-1 text-sm">
      <p>
        {recorded ? labLive.recordedCost : labLive.costOfRun}{' '}
        <span className="font-mono tabular-nums">{cost.value}</span>{' '}
        <span className="text-muted">{cost.unit}</span>
      </p>
      {monthly === null ? null : <p>{monthly}</p>}
      <p className="text-muted">{labLive.priceNote(pricesAsOf)}</p>
      {typeof runsLeft === 'number' && !recorded ? (
        <p>{labLive.runsLeft(runsLeft)}</p>
      ) : null}
    </div>
  )
}
