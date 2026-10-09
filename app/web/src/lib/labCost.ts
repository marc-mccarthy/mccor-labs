import type { Frequency } from '@/content/lab/rubric'

export interface Formatted {
  value: string
  unit: string
}

export const USD_FLOOR = 0.0001
const MONTHLY_FLOOR = 0.01
const MS_PER_SECOND = 1000
const CEIL_EPSILON = 1e-9

export const GUARDRAIL_PER_1K_UNITS_USD = 0.15
export const FIXED_GUARDRAIL_UNITS = 2
export const FIXED_GUARDRAIL_USD =
  (FIXED_GUARDRAIL_UNITS / 1000) * GUARDRAIL_PER_1K_UNITS_USD

export const RUNS_PER_MONTH: Record<Exclude<Frequency, null>, number> = {
  daily: 30,
  weekly: 52 / 12,
  'monthly-or-less': 1,
}

function ceilUnits(v: number, decimals: number): number {
  const scaled = v * 10 ** decimals
  const nearest = Math.round(scaled)
  if (Math.abs(scaled - nearest) <= CEIL_EPSILON * Math.max(1, Math.abs(scaled))) {
    return nearest
  }
  return Math.ceil(scaled)
}

function fixedCeil(v: number, decimals: number): string {
  return (ceilUnits(v, decimals) / 10 ** decimals).toFixed(decimals)
}

export function formatUsd(v: number): Formatted {
  if (v === 0) return { value: '0', unit: 'USD' }
  if (v < USD_FLOOR) return { value: `under ${USD_FLOOR.toFixed(4)}`, unit: 'USD' }
  return { value: fixedCeil(v, 4), unit: 'USD' }
}

export function formatMonthlyUsd(v: number): Formatted {
  if (ceilUnits(v, 4) / 10 ** 4 < MONTHLY_FLOOR) return formatUsd(v)
  return { value: fixedCeil(v, 2), unit: 'USD' }
}

export function formatMs(ms: number): Formatted {
  const rounded = Math.round(ms)
  if (rounded < MS_PER_SECOND) return { value: String(rounded), unit: 'ms' }
  return { value: (ms / MS_PER_SECOND).toFixed(2), unit: 's' }
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
  const perItem = costUsd / examples + ((examples - 1) / examples) * FIXED_GUARDRAIL_USD
  return perItem * RUNS_PER_MONTH[frequency]
}
