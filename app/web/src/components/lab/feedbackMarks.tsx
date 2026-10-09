'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { RuleId, Verdict } from '@/content/lab/rubric'

interface FeedbackMarks {
  readonly alreadySent: (key: string) => boolean
  readonly recordSent: (key: string) => void
}

const FeedbackMarksContext = createContext<FeedbackMarks | null>(null)

export function markKey(stepId: string, verdict: Verdict, ruleId: RuleId): string {
  return `${stepId}:${verdict}:${ruleId}`
}

export function FeedbackMarksProvider({ children }: { children: ReactNode }) {
  const [sent, setSent] = useState<ReadonlySet<string>>(() => new Set())

  const alreadySent = useCallback((key: string) => sent.has(key), [sent])

  const recordSent = useCallback((key: string) => {
    setSent((previous) => (previous.has(key) ? previous : new Set(previous).add(key)))
  }, [])

  const value = useMemo(() => ({ alreadySent, recordSent }), [alreadySent, recordSent])

  return (
    <FeedbackMarksContext.Provider value={value}>
      {children}
    </FeedbackMarksContext.Provider>
  )
}

export function useFeedbackMarks(): FeedbackMarks {
  const marks = useContext(FeedbackMarksContext)
  if (marks === null) {
    throw new Error('useFeedbackMarks must be used inside FeedbackMarksProvider')
  }
  return marks
}
