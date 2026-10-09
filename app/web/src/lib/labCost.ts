import type { Frequency } from '@/content/lab/rubric'

export interface Formatted {
  value: string
  unit: string
}

const USD_FLOOR = 0.0001
const MONTHLY_FLOOR = 0.01

export const RUNS_PER_MONTH: Record<Exclude<Frequency, null>, number> = {
  daily: 30,
  weekly: 52 / 12,
  'monthly-or-less': 1,
}

export function formatUsd(v: number): Formatted {
  if (v < USD_FLOOR) return { value: `under ${USD_FLOOR.toFixed(4)}`, unit: 'USD' }
  return { value: v.toFixed(4), unit: 'USD' }
}

export function formatMonthlyUsd(v: number): Formatted {
  if (v < MONTHLY_FLOOR) return formatUsd(v)
  return { value: v.toFixed(2), unit: 'USD' }
}

export function formatMs(ms: number): Formatted {
  if (ms < 1000) return { value: String(Math.round(ms)), unit: 'ms' }
  return { value: (ms / 1000).toFixed(2), unit: 's' }
}

export function formatTokens(n: number): Formatted {
  return { value: n.toLocaleString('en-US'), unit: 'tokens' }
}

export function formatText(f: Formatted): string {
  return `${f.value} ${f.unit}`
}

export function monthlyModelUsd(
  costUsd: number,
  examples: number,
  frequency: Frequency,
): number | null {
  if (frequency === null || examples < 1) return null
  return (costUsd / examples) * RUNS_PER_MONTH[frequency]
}
