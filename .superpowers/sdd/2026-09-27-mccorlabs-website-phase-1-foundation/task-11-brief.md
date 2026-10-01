## Task 11: Contact form client with a graceful missing-endpoint path

**Files:**
- Create: `app/web/src/lib/contact.ts`, `app/web/src/lib/contact.test.ts`
- Create: `app/web/src/components/contact/ContactForm.tsx`, `ContactForm.test.tsx`
- Modify: `app/web/src/app/contact/page.tsx`

**Interfaces:**
- Consumes: Tasks 7 and 8.
- Produces: `ContactRequest`, `ContactResponse`, `validateContact()`, `submitContact()`, `<ContactForm>`.

- [ ] **Step 1: Write the failing contact client test**

Create `app/web/src/lib/contact.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { submitContact, validateContact, type ContactRequest } from './contact'

const valid: ContactRequest = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'We need a marketing site and a client portal.',
  honeypot: '',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('validateContact', () => {
  it('accepts a well-formed submission', () => {
    expect(validateContact(valid)).toEqual({})
  })

  it('requires a name', () => {
    expect(validateContact({ ...valid, name: '' }).name).toBeTruthy()
  })

  it('rejects a malformed email', () => {
    expect(validateContact({ ...valid, email: 'nope' }).email).toBeTruthy()
  })

  it('requires a message of at least ten characters', () => {
    expect(validateContact({ ...valid, message: 'too short' }).message).toBeTruthy()
  })

  it('rejects an over-long message rather than sending it', () => {
    expect(validateContact({ ...valid, message: 'x'.repeat(5001) }).message).toBeTruthy()
  })
})

describe('submitContact', () => {
  it('returns a server error without fetching when no endpoint is configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await submitContact(valid, null)
    expect(result).toEqual({ ok: false, error: 'server' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('refuses to send a payload it knows is invalid', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await submitContact({ ...valid, email: 'nope' }, 'https://api.test/contact')
    expect(result).toEqual({ ok: false, error: 'validation' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('reports success on a 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    expect(await submitContact(valid, 'https://api.test/contact')).toEqual({ ok: true })
  })

  it('maps a 429 to rate_limit', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 429 }))
    expect(await submitContact(valid, 'https://api.test/contact')).toEqual({
      ok: false,
      error: 'rate_limit',
    })
  })

  it('maps a 400 to validation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 400 }))
    expect(await submitContact(valid, 'https://api.test/contact')).toEqual({
      ok: false,
      error: 'validation',
    })
  })

  it('maps a network failure to server rather than throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    expect(await submitContact(valid, 'https://api.test/contact')).toEqual({
      ok: false,
      error: 'server',
    })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm -F web exec vitest run src/lib/contact.test.ts`
Expected: FAIL — cannot resolve `./contact`.

- [ ] **Step 3: Create the contact client**

Create `app/web/src/lib/contact.ts`:

```ts
export type ContactRequest = {
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

export type ContactErrors = Partial<Record<'name' | 'email' | 'company' | 'message', string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateContact(request: ContactRequest): ContactErrors {
  const errors: ContactErrors = {}
  const name = request.name.trim()
  const email = request.email.trim()
  const message = request.message.trim()

  if (name.length < 1) errors.name = 'Please tell us your name.'
  else if (name.length > 100) errors.name = 'That name is too long.'

  if (!EMAIL.test(email)) errors.email = 'Please enter a valid email address.'

  if ((request.company ?? '').length > 100) errors.company = 'That company name is too long.'

  if (message.length < 10) errors.message = 'Please add a little more detail.'
  else if (message.length > 5000) errors.message = 'Please shorten this to under 5000 characters.'

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
```

- [ ] **Step 4: Run the client test to verify it passes**

Run: `pnpm -F web exec vitest run src/lib/contact.test.ts`
Expected: PASS — all twelve cases.

- [ ] **Step 5: Write the failing form test**

This pins Review Focus item 4. Create `app/web/src/components/contact/ContactForm.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactForm } from './ContactForm'
import { site } from '@/content/site'
import { ui } from '@/content/ui'

describe('ContactForm with no endpoint configured', () => {
  it('shows a real way to make contact instead of a dead button', () => {
    render(<ContactForm endpoint={null} />)
    expect(screen.queryByRole('button', { name: ui.formSubmit })).not.toBeInTheDocument()
    // The mailto is always present; the booking link only when configured.
    expect(screen.getByRole('link', { name: /mccorlabs\.com/i })).toHaveAttribute(
      'href',
      `mailto:${site.contactEmail}`,
    )
  })
})

describe('ContactForm with an endpoint', () => {
  it('labels every field', () => {
    render(<ContactForm endpoint="https://api.test/contact" />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
  })

  it('shows inline errors and does not fetch when the form is invalid', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<ContactForm endpoint="https://api.test/contact" />)
    await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
    expect(await screen.findByText('Please tell us your name.')).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('announces success in a live region', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )
    render(<ContactForm endpoint="https://api.test/contact" />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Ada Lovelace')
    await userEvent.type(screen.getByLabelText(/email/i), 'ada@example.com')
    await userEvent.type(
      screen.getByLabelText(/message/i),
      'We need a marketing site and a portal.',
    )
    await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
    expect(await screen.findByRole('status')).toHaveTextContent(ui.formSuccess)
  })

  it('keeps the honeypot out of the tab order', () => {
    render(<ContactForm endpoint="https://api.test/contact" />)
    const honeypot = document.querySelector('input[name="honeypot"]')
    expect(honeypot).toHaveAttribute('tabindex', '-1')
    expect(honeypot).toHaveAttribute('aria-hidden', 'true')
  })
})
```

- [ ] **Step 6: Install the interaction testing library**

Run: `pnpm -F web add -D @testing-library/user-event@^15`

- [ ] **Step 7: Run it to verify it fails**

Run: `pnpm -F web exec vitest run src/components/contact`
Expected: FAIL — cannot resolve `./ContactForm`.

- [ ] **Step 8: Create the form**

Create `app/web/src/components/contact/ContactForm.tsx`:

```tsx
'use client'

import { useState, type FormEvent } from 'react'

import { BookingCta } from '@/components/layout/BookingCta'
import { Button } from '@/components/ui/button'
import { site } from '@/content/site'
import { ui } from '@/content/ui'
import { submitContact, validateContact, type ContactErrors } from '@/lib/contact'

type Status = 'idle' | 'sending' | 'sent' | 'error'

const FIELD =
  'border-border-strong bg-surface text-text placeholder:text-muted w-full rounded-lg border px-3 py-2'

export function ContactForm({ endpoint }: { endpoint: string | null }) {
  const [errors, setErrors] = useState<ContactErrors>({})
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  // No endpoint provisioned yet: offer routes that actually work rather than
  // a button that silently fails.
  if (endpoint === null) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <p className="text-text">
          Our contact form is not live yet — book a call or email us directly.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <BookingCta />
          <Button asChild variant="link">
            <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
          </Button>
        </div>
      </div>
    )
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const request = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      company: String(data.get('company') ?? ''),
      message: String(data.get('message') ?? ''),
      budget: String(data.get('budget') ?? ''),
      honeypot: String(data.get('honeypot') ?? ''),
    }

    const found = validateContact(request)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setStatus('idle')
      setMessage('')
      return
    }

    setStatus('sending')
    const result = await submitContact(request, endpoint)

    if (result.ok) {
      setStatus('sent')
      setMessage(ui.formSuccess)
      return
    }

    setStatus('error')
    setMessage(
      result.error === 'rate_limit'
        ? ui.formErrorRateLimit
        : result.error === 'validation'
          ? ui.formErrorValidation
          : ui.formErrorServer,
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl space-y-5">
      <div>
        <label htmlFor="name" className="text-text mb-1 block text-sm">
          Name
        </label>
        <input
          id="name"
          name="name"
          className={FIELD}
          aria-invalid={errors.name !== undefined}
          aria-describedby={errors.name === undefined ? undefined : 'name-error'}
        />
        {errors.name !== undefined && (
          <p id="name-error" className="text-accent mt-1 text-sm">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="text-text mb-1 block text-sm">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className={FIELD}
          aria-invalid={errors.email !== undefined}
          aria-describedby={errors.email === undefined ? undefined : 'email-error'}
        />
        {errors.email !== undefined && (
          <p id="email-error" className="text-accent mt-1 text-sm">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="company" className="text-text mb-1 block text-sm">
          Company <span className="text-muted">(optional)</span>
        </label>
        <input id="company" name="company" className={FIELD} />
      </div>

      <div>
        <label htmlFor="budget" className="text-text mb-1 block text-sm">
          Budget <span className="text-muted">(optional)</span>
        </label>
        <select id="budget" name="budget" className={FIELD} defaultValue="">
          <option value="">Prefer not to say</option>
          {site.budgetOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className="text-text mb-1 block text-sm">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          className={FIELD}
          aria-invalid={errors.message !== undefined}
          aria-describedby={errors.message === undefined ? undefined : 'message-error'}
        />
        {errors.message !== undefined && (
          <p id="message-error" className="text-accent mt-1 text-sm">
            {errors.message}
          </p>
        )}
      </div>

      {/* Honeypot: hidden from sight and from the keyboard, but present in the
          DOM so naive bots fill it. Not display:none, which some bots detect. */}
      <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="honeypot">Leave this empty</label>
        <input id="honeypot" name="honeypot" tabIndex={-1} aria-hidden="true" />
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? ui.formSending : ui.formSubmit}
        </Button>
      </div>

      <p role="status" aria-live="polite" className="text-muted text-sm">
        {message}
      </p>
    </form>
  )
}
```

- [ ] **Step 9: Run the form test to verify it passes**

Run: `pnpm -F web exec vitest run src/components/contact`
Expected: PASS — all five cases.

- [ ] **Step 10: Wire the form into the contact route**

Replace `app/web/src/app/contact/page.tsx`:

```tsx
import type { Metadata } from 'next'

import { ContactForm } from '@/components/contact/ContactForm'
import { Container } from '@/components/layout/Container'
import { Section } from '@/components/layout/Section'
import { PageHeader } from '@/components/sections/PageHeader'
import { env } from '@/lib/env'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Tell us about the project, or book a call directly.',
}

export default function ContactPage() {
  return (
    <>
      <PageHeader
        title="Contact"
        description="Tell us about the project, or book a call directly."
      />
      <Section className="pt-0">
        <Container>
          <ContactForm endpoint={env.contactEndpoint} />
        </Container>
      </Section>
    </>
  )
}
```

- [ ] **Step 11: Verify the build still exports**

Run: `pnpm -F web build && test -f app/web/out/contact/index.html && echo "ok contact"`
Expected: `ok contact`.

- [ ] **Step 12: Commit**

```bash
git add app/web/src/lib/contact.ts app/web/src/lib/contact.test.ts app/web/src/components/contact app/web/src/app/contact app/web/package.json pnpm-lock.yaml
git commit -m "feat(web): contact form client that degrades without an endpoint"
```

---

