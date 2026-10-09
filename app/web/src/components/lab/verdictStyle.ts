import type { Verdict } from '@/content/lab/rubric'

interface VerdictStyle {
  readonly marker: string
  readonly card: string
  readonly cardRule?: string
}

export const VERDICT_STYLE: Readonly<Record<Verdict, VerdictStyle>> = {
  'plain-code': { marker: 'size-3 bg-text', card: 'border-border-strong' },
  rules: { marker: 'size-3 border border-border-strong', card: 'border-border-strong' },
  'classic-ml': {
    marker: 'size-3 rounded-full border border-accent',
    card: 'border-border',
  },
  'language-model': { marker: 'size-3 rounded-full bg-accent', card: 'border-border' },
  'do-not-automate': {
    marker: 'h-3 w-px bg-brand',
    card: 'relative overflow-hidden border-border bg-elevated',
    cardRule: 'absolute inset-y-0 left-0 w-px bg-brand',
  },
  unclear: {
    marker: 'size-3 border border-dashed border-border-strong',
    card: 'border-border',
  },
}
