'use client'

import { useState, type SubmitEvent } from 'react'

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

  if (endpoint === null) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="text-text">{ui.contactNotLive}</p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <BookingCta />
          <Button asChild variant="link">
            <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
          </Button>
        </div>
      </div>
    )
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const field = (key: string) => {
      const value = data.get(key)
      return typeof value === 'string' ? value : ''
    }
    const request = {
      name: field('name'),
      email: field('email'),
      company: field('company'),
      message: field('message'),
      budget: field('budget'),
      honeypot: field('honeypot'),
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
    <form
      onSubmit={(event) => {
        void onSubmit(event)
      }}
      noValidate
      className="max-w-xl space-y-5"
    >
      <div>
        <label htmlFor="name" className="mb-1 block text-sm text-text">
          {ui.contactLabelName}
        </label>
        <input
          id="name"
          name="name"
          className={FIELD}
          aria-invalid={errors.name !== undefined}
          aria-describedby={errors.name === undefined ? undefined : 'name-error'}
        />
        {errors.name !== undefined && (
          <p id="name-error" className="mt-1 text-sm text-accent">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm text-text">
          {ui.contactLabelEmail}
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
          <p id="email-error" className="mt-1 text-sm text-accent">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="company" className="mb-1 block text-sm text-text">
          {ui.contactLabelCompany}{' '}
          <span className="text-muted">{ui.contactOptional}</span>
        </label>
        <input id="company" name="company" className={FIELD} />
      </div>

      <div>
        <label htmlFor="budget" className="mb-1 block text-sm text-text">
          {ui.contactLabelBudget} <span className="text-muted">{ui.contactOptional}</span>
        </label>
        <select id="budget" name="budget" className={FIELD} defaultValue="">
          <option value="">{ui.contactBudgetPlaceholder}</option>
          {site.budgetOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className="mb-1 block text-sm text-text">
          {ui.contactLabelMessage}
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
          <p id="message-error" className="mt-1 text-sm text-accent">
            {errors.message}
          </p>
        )}
      </div>

      <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="honeypot">{ui.contactHoneypotLabel}</label>
        <input id="honeypot" name="honeypot" tabIndex={-1} aria-hidden="true" />
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? ui.formSending : ui.formSubmit}
        </Button>
      </div>

      <p role="status" aria-live="polite" className="text-sm text-muted">
        {message}
      </p>
    </form>
  )
}
