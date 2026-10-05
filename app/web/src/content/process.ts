import type { ProcessStage } from './types'

export const process: readonly ProcessStage[] = [
  {
    index: 1,
    title: 'Discovery',
    summary:
      'We learn what you actually need, not just the brief you arrived with, and scope the smallest thing that answers the real question.',
    duration: '1–2 weeks',
  },
  {
    index: 2,
    title: 'Fixed-scope proof of concept',
    summary:
      'A bounded build against a fixed price, so you see working software and real cost before committing to the full engagement.',
    duration: '2–4 weeks',
  },
  {
    index: 3,
    title: 'Go / no-go',
    summary:
      'A real decision point. We tell you plainly whether the proof of concept earned the rest of the build, and you decide whether to continue.',
    duration: '1 meeting',
  },
  {
    index: 4,
    title: 'Build',
    summary:
      'The full engagement, delivered in reviewable increments with tests behind every one.',
    duration: '6–12 weeks',
  },
  {
    index: 5,
    title: 'Handover',
    summary:
      'The repository, infrastructure and documentation move into your name, with a runbook behind them.',
    duration: '1 week',
  },
] as const
