import { ui } from '@/content/ui'
import { signedPostJson } from '@/lib/signedPost'

export interface ContactRequest {
  name: string
  email: string
  company?: string
  message: string
  budget?: string
  honeypot: string
  elapsedMs: number
}

export type ContactError =
  'validation' | 'too_fast' | 'rate_limit' | 'daily_cap' | 'server'

export type ContactResponse =
  | { ok: true; reference: string | null }
  | { ok: false; error: ContactError; detail?: string }

export type ContactErrors = Partial<
  Record<'name' | 'email' | 'company' | 'message', string>
>

export const CONTACT_TIMEOUT_MS = 15000

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateContact(request: ContactRequest): ContactErrors {
  const errors: ContactErrors = {}
  const name = request.name.trim()
  const email = request.email.trim()
  const message = request.message.trim()

  if (name.length < 1) errors.name = ui.contactErrorName
  else if (name.length > 100) errors.name = ui.contactErrorNameLength

  if (!EMAIL.test(email)) errors.email = ui.contactErrorEmail

  if ((request.company ?? '').length > 100) errors.company = ui.contactErrorCompanyLength

  if (message.length < 10) errors.message = ui.contactErrorMessage
  else if (message.length > 5000) errors.message = ui.contactErrorMessageLength

  return errors
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  const text = await response.text()
  try {
    const data: unknown = JSON.parse(text)
    return typeof data === 'object' && data !== null
      ? (data as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

async function postWithin(
  endpoint: string,
  request: ContactRequest,
): Promise<Response | 'timeout'> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => {
      resolve('timeout')
    }, CONTACT_TIMEOUT_MS)
  })
  try {
    return await Promise.race([signedPostJson(endpoint, request), timeout])
  } finally {
    clearTimeout(timer)
  }
}

export async function submitContact(
  request: ContactRequest,
  endpoint: string | null,
): Promise<ContactResponse> {
  if (endpoint === null) return { ok: false, error: 'server' }
  if (Object.keys(validateContact(request)).length > 0) {
    return { ok: false, error: 'validation' }
  }

  try {
    const response = await postWithin(endpoint, request)
    if (response === 'timeout') return { ok: false, error: 'server' }
    const data = await readJson(response)

    if (response.ok) {
      return {
        ok: true,
        reference: typeof data?.reference === 'string' ? data.reference : null,
      }
    }
    if (response.status === 429) {
      return {
        ok: false,
        error: data?.reason === 'daily_cap' ? 'daily_cap' : 'rate_limit',
      }
    }
    if (response.status === 400) {
      return { ok: false, error: data?.reason === 'too_fast' ? 'too_fast' : 'validation' }
    }
    return { ok: false, error: 'server' }
  } catch {
    return { ok: false, error: 'server' }
  }
}

export const MAILTO_BODY_MAX = 1500

const CUT_MARK = '…'

function capBody(message: string): string {
  if (encodeURIComponent(message).length <= MAILTO_BODY_MAX) return message
  const room = MAILTO_BODY_MAX - encodeURIComponent(CUT_MARK).length
  let used = 0
  let kept = ''
  for (const point of message) {
    const size = encodeURIComponent(point).length
    if (used + size > room) break
    used += size
    kept += point
  }
  return `${kept}${CUT_MARK}`
}

export function contactMailtoHref(
  email: string,
  subject: string,
  message: string,
): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(capBody(message))}`
}
