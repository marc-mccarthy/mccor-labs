import type { FeedbackReasonId } from '@/content/lab/feedback'
import { FEEDBACK_ENDPOINT } from '@/content/lab/feedback'
import type { RuleId, Verdict } from '@/content/lab/rubric'
import { signedPostJson } from '@/lib/signedPost'

export type FeedbackOutcome = 'sent' | 'daily_cap' | 'error'

export interface FeedbackBody {
  verdictId: Verdict
  ruleId: RuleId
  rubricVersion: string
  reason: FeedbackReasonId
}

export async function sendFeedback(body: FeedbackBody): Promise<FeedbackOutcome> {
  let response: Response
  try {
    response = await signedPostJson(FEEDBACK_ENDPOINT, {
      verdictId: body.verdictId,
      ruleId: body.ruleId,
      rubricVersion: body.rubricVersion,
      reason: body.reason,
    })
  } catch {
    return 'error'
  }
  if (response.status === 202 || response.status === 200) return 'sent'
  if (response.status === 429) return 'daily_cap'
  return 'error'
}
