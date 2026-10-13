export const FEEDBACK_ENDPOINT = '/api/feedback'

export const FEEDBACK_REASONS = [
  { id: 'needs-less', label: 'A simpler tool would do' },
  { id: 'needs-more', label: 'This needs more than that' },
  { id: 'questions-missed', label: 'The questions missed something' },
] as const

export type FeedbackReasonId = (typeof FEEDBACK_REASONS)[number]['id']

export const feedbackCopy = {
  toggle: 'Wrong?',
  legend: 'What is wrong with this verdict?',
  send: 'Send',
  sending: 'Sending…',
  pickFirst: 'Pick a reason first',
  sent: 'Thanks. We count these marks each week to improve the rubric.',
  dailyCap: 'We have taken all the marks we can today. Thank you for trying.',
  error: 'That did not send. Try again.',
  note: 'We keep only the verdict, the rubric rule and version, and your reason. Nothing about you or your steps.',
} as const
