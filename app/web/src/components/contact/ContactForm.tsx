'use client'

import { useEffect, useRef, useState, type SubmitEvent } from 'react'

import { BookingCta } from '@/components/layout/BookingCta'
import { Reveal } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/button'
import { contactLabCopy } from '@/content/lab/copy'
import { site } from '@/content/site'
import { ui } from '@/content/ui'
import {
  contactMailtoHref,
  submitContact,
  validateContact,
  type ContactError,
  type ContactErrors,
} from '@/lib/contact'
import { labMailtoHref } from '@/lib/labResult'

import { useLabPrefill } from './useLabPrefill'

type Status = 'idle' | 'sending' | 'sent' | 'error'

const FIELD =
  'border-border-strong bg-surface text-text placeholder:text-muted w-full rounded-lg border px-3 py-2'

function errorMessage(error: ContactError): string {
  if (error === 'daily_cap') return ui.formErrorDailyCap
  if (error === 'too_fast') return ui.formErrorTooFast
  if (error === 'rate_limit') return ui.formErrorRateLimit
  if (error === 'validation') return ui.formErrorValidation
  return ui.formErrorServer
}

function offersMailto(error: ContactError): boolean {
  return error === 'daily_cap' || error === 'server'
}

function StatusText({ text, href }: { text: string; href: string | null }) {
  if (href === null) return text
  const [before, after] = text.split(site.contactEmail)
  return (
    <>
      {before}
      <a href={href} className="text-accent underline underline-offset-4">
        {site.contactEmail}
      </a>
      {after}
    </>
  )
}

export function ContactForm({ endpoint }: { endpoint: string | null }) {
  const [errors, setErrors] = useState<ContactErrors>({})
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [mailtoHref, setMailtoHref] = useState<string | null>(null)
  const openedAt = useRef(0)
  const prefill = useLabPrefill()

  useEffect(() => {
    openedAt.current = Date.now()
  }, [])

  if (endpoint === null) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        {prefill !== null && <p className="mb-4 text-text">{contactLabCopy.added}</p>}
        <p className="text-text">{ui.contactNotLive}</p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <BookingCta />
          {prefill !== null && (
            <Button asChild variant="link">
              <a href={labMailtoHref(site.contactEmail, prefill)}>
                {contactLabCopy.emailResults}
              </a>
            </Button>
          )}
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
      elapsedMs: Date.now() - openedAt.current,
    }

    const found = validateContact(request)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setStatus('idle')
      setMessage('')
      setMailtoHref(null)
      return
    }

    setStatus('sending')
    const result = await submitContact(request, endpoint)

    if (result.ok) {
      setStatus('sent')
      setMessage(
        result.reference === null
          ? ui.formSuccess
          : `${ui.formSuccess} ${ui.formReference} ${result.reference}.`,
      )
      setMailtoHref(null)
      return
    }

    setStatus('error')
    setMessage(errorMessage(result.error))
    setMailtoHref(
      offersMailto(result.error)
        ? contactMailtoHref(site.contactEmail, ui.formMailtoSubject, request.message)
        : null,
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
      {prefill !== null && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-4">
          <p className="text-text">{contactLabCopy.added}</p>
          <BookingCta size="sm" />
        </div>
      )}

      <Reveal>
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
            <p id="name-error" className="mt-1 text-sm text-brand">
              {errors.name}
            </p>
          )}
        </div>
      </Reveal>

      <Reveal>
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
            <p id="email-error" className="mt-1 text-sm text-brand">
              {errors.email}
            </p>
          )}
        </div>
      </Reveal>

      <Reveal>
        <div>
          <label htmlFor="company" className="mb-1 block text-sm text-text">
            {ui.contactLabelCompany}{' '}
            <span className="text-muted">{ui.contactOptional}</span>
          </label>
          <input id="company" name="company" className={FIELD} />
        </div>
      </Reveal>

      <Reveal>
        <div>
          <label htmlFor="budget" className="mb-1 block text-sm text-text">
            {ui.contactLabelBudget}{' '}
            <span className="text-muted">{ui.contactOptional}</span>
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
      </Reveal>

      <Reveal>
        <div>
          <label htmlFor="message" className="mb-1 block text-sm text-text">
            {ui.contactLabelMessage}
          </label>
          <textarea
            id="message"
            name="message"
            rows={6}
            key={prefill ?? 'empty'}
            defaultValue={prefill ?? undefined}
            className={FIELD}
            aria-invalid={errors.message !== undefined}
            aria-describedby={errors.message === undefined ? undefined : 'message-error'}
          />
          {errors.message !== undefined && (
            <p id="message-error" className="mt-1 text-sm text-brand">
              {errors.message}
            </p>
          )}
        </div>
      </Reveal>

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
        <StatusText text={message} href={mailtoHref} />
      </p>
    </form>
  )
}
