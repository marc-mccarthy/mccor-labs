export interface ContactInput {
  name: string
  email: string
  company: string
  budget: string
  message: string
}

export type ContactCheck =
  | { kind: 'ok'; value: ContactInput }
  | { kind: 'spam' }
  | { kind: 'invalid'; reason: 'validation' | 'too_fast' }

export const MIN_FILL_MS = 3000

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INVALID: ContactCheck = { kind: 'invalid', reason: 'validation' }

function text(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  if (value === undefined) return ''
  return typeof value === 'string' ? value : null
}

function isValid(input: ContactInput): boolean {
  return (
    input.name.length >= 1 &&
    input.name.length <= 100 &&
    input.email.length <= 254 &&
    EMAIL.test(input.email) &&
    input.company.length <= 100 &&
    input.budget.length <= 40 &&
    input.message.length >= 10 &&
    input.message.length <= 5000
  )
}

export function checkContact(body: unknown): ContactCheck {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return INVALID
  const record = body as Record<string, unknown>
  const honeypot = text(record, 'honeypot')
  if (honeypot === null) return INVALID
  if (honeypot.trim() !== '') return { kind: 'spam' }

  const elapsed = record.elapsedMs
  if (typeof elapsed !== 'number' || !Number.isFinite(elapsed)) return INVALID
  if (elapsed < MIN_FILL_MS) return { kind: 'invalid', reason: 'too_fast' }

  const name = text(record, 'name')
  const email = text(record, 'email')
  const company = text(record, 'company')
  const budget = text(record, 'budget')
  const message = text(record, 'message')
  if (
    name === null ||
    email === null ||
    company === null ||
    budget === null ||
    message === null
  ) {
    return INVALID
  }

  const input: ContactInput = {
    name: name.trim(),
    email: email.trim(),
    company: company.trim(),
    budget: budget.trim(),
    message: message.trim(),
  }
  return isValid(input) ? { kind: 'ok', value: input } : INVALID
}
