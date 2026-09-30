export interface ContactRequest {
  name: string
  email: string
  company?: string
  message: string
  budget?: string
  /** Must stay empty. A bot filling it means the submission is discarded. */
  honeypot: string
}

export type ContactResponse =
  | { ok: true }
  | { ok: false; error: 'validation' | 'rate_limit' | 'server'; detail?: string }

export type ContactErrors = Partial<
  Record<'name' | 'email' | 'company' | 'message', string>
>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateContact(request: ContactRequest): ContactErrors {
  const errors: ContactErrors = {}
  const name = request.name.trim()
  const email = request.email.trim()
  const message = request.message.trim()

  if (name.length < 1) errors.name = 'Please tell us your name.'
  else if (name.length > 100) errors.name = 'That name is too long.'

  if (!EMAIL.test(email)) errors.email = 'Please enter a valid email address.'

  if ((request.company ?? '').length > 100)
    errors.company = 'That company name is too long.'

  if (message.length < 10) errors.message = 'Please add a little more detail.'
  else if (message.length > 5000)
    errors.message = 'Please shorten this to under 5000 characters.'

  return errors
}

/**
 * Posts the submission. Validates locally first and never sends a payload it
 * knows to be invalid, so a `validation` response from the server indicates a
 * bug or an attack rather than ordinary user error.
 */
export async function submitContact(
  request: ContactRequest,
  endpoint: string | null,
): Promise<ContactResponse> {
  if (endpoint === null) return { ok: false, error: 'server' }
  if (Object.keys(validateContact(request)).length > 0) {
    return { ok: false, error: 'validation' }
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    })

    if (response.ok) return { ok: true }
    if (response.status === 429) return { ok: false, error: 'rate_limit' }
    if (response.status === 400) return { ok: false, error: 'validation' }
    return { ok: false, error: 'server' }
  } catch {
    return { ok: false, error: 'server' }
  }
}
