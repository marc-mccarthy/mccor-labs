import type { Feedback } from './feedbackInput'

export const MARK_TTL_DAYS = 90

export interface MarkItem extends Feedback {
  pk: string
  createdAt: string
  expiresAt: number
}

export function toMarkItem(feedback: Feedback, now: Date, id: string): MarkItem {
  return {
    pk: `mark#${id}`,
    ...feedback,
    createdAt: now.toISOString(),
    expiresAt: Math.floor(now.getTime() / 1000) + MARK_TTL_DAYS * 86400,
  }
}
