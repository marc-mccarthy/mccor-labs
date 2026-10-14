'use client'

import { useEffect, useRef, useState, type SubmitEvent } from 'react'

import { BookingCta } from '@/components/layout/BookingCta'
import { Stagger } from '@/components/motion/Stagger'
import { Button } from '@/components/ui/button'
import { fieldVariants } from '@/components/ui/field'
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

const FIELD_ORDER = ['name', 'email', 'message'] as const

const LABEL =
  'mb-1 block text-sm text-text motion-on:transition-colors motion-on:duration-(--duration-pointer) group-focus-within/field:text-accent'

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
  const [errorKind, setErrorKind] = useState<ContactError | null>(null)
  const [, setReference] = useState<string | null>(null)
  const [submitCount, setSubmitCount] = useState(0)
  const openedAt = useRef(0)
  const prefill = useLabPrefill()

  useEffect(() => {
    openedAt.current = Date.now()
  }, [])

  useEffect(() => {
    if (submitCount === 0) return
    const first = FIELD_ORDER.find((key) => errors[key] !== undefined)
    if (first !== undefined) document.getElementById(first)?.focus()
  }, [errors, submitCount])

  if (endpoint === null) {
    return (
      <div>
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
    if (status === 'sending' || status === 'sent') return
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
    setSubmitCount((count) => count + 1)
    if (Object.keys(found).length > 0) {
      setStatus('idle')
      setMessage('')
      setMailtoHref(null)
      setErrorKind(null)
      setReference(null)
      return
    }

    setStatus('sending')
    setErrorKind(null)
    setReference(null)
    const result = await submitContact(request, endpoint)

    if (result.ok) {
      setStatus('sent')
      setReference(result.reference)
      setMessage(
        result.reference === null
          ? ui.formSuccess
          : `${ui.formSuccess} ${ui.formReference} ${result.reference}.`,
      )
      setMailtoHref(null)
      return
    }

    setStatus('error')
    setErrorKind(result.error)
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
      onInput={() => {
        if (status === 'sent') setStatus('idle')
      }}
      noValidate
      data-status={status}
      data-error={errorKind ?? undefined}
      aria-busy={status === 'sending'}
      className="group/form space-y-5"
    >
      {prefill !== null && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-4">
          <p className="text-text">{contactLabCopy.added}</p>
          <BookingCta size="sm" />
        </div>
      )}

      <Stagger>
        <div className="group/field">
          <label htmlFor="name" className={LABEL}>
            {ui.contactLabelName}
          </label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            className={fieldVariants({ kind: 'input' })}
            aria-invalid={errors.name !== undefined}
            aria-describedby={errors.name === undefined ? undefined : 'name-error'}
          />
          {errors.name !== undefined && (
            <p id="name-error" className="mt-1 text-sm text-brand">
              {errors.name}
            </p>
          )}
        </div>
        <div className="group/field">
          <label htmlFor="email" className={LABEL}>
            {ui.contactLabelEmail}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={fieldVariants({ kind: 'input' })}
            aria-invalid={errors.email !== undefined}
            aria-describedby={errors.email === undefined ? undefined : 'email-error'}
          />
          {errors.email !== undefined && (
            <p id="email-error" className="mt-1 text-sm text-brand">
              {errors.email}
            </p>
          )}
        </div>
        <div className="group/field">
          <label htmlFor="company" className={LABEL}>
            {ui.contactLabelCompany}{' '}
            <span className="text-muted">{ui.contactOptional}</span>
          </label>
          <input
            id="company"
            name="company"
            autoComplete="organization"
            maxLength={100}
            className={fieldVariants({ kind: 'input' })}
          />
        </div>
        <div className="group/field">
          <label htmlFor="budget" className={LABEL}>
            {ui.contactLabelBudget}{' '}
            <span className="text-muted">{ui.contactOptional}</span>
          </label>
          <div className="relative">
            <select
              id="budget"
              name="budget"
              className={fieldVariants({ kind: 'select' })}
              defaultValue=""
            >
              <option value="">{ui.contactBudgetPlaceholder}</option>
              {site.budgetOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              data-select-chevron=""
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted group-focus-within/field:text-accent motion-on:transition-transform motion-on:group-focus-within/field:rotate-180"
            >
              <path d="M3 6l5 5 5-5" />
            </svg>
          </div>
        </div>
        <div className="group/field">
          <label htmlFor="message" className={LABEL}>
            {ui.contactLabelMessage}
          </label>
          <textarea
            id="message"
            name="message"
            rows={6}
            key={prefill ?? 'empty'}
            defaultValue={prefill ?? undefined}
            className={fieldVariants({ kind: 'textarea' })}
            aria-invalid={errors.message !== undefined}
            aria-describedby={errors.message === undefined ? undefined : 'message-error'}
          />
          {errors.message !== undefined && (
            <p id="message-error" className="mt-1 text-sm text-brand">
              {errors.message}
            </p>
          )}
        </div>
      </Stagger>

      <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="honeypot">{ui.contactHoneypotLabel}</label>
        <input
          id="honeypot"
          name="honeypot"
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="off"
        />
      </div>

      <div className="flex items-center gap-4">
        <Button
          type="submit"
          aria-disabled={status === 'sending' || status === 'sent'}
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        >
          {status === 'sending' ? ui.formSending : ui.formSubmit}
        </Button>
      </div>

      <p role="status" aria-live="polite" className="text-sm text-muted">
        <StatusText text={message} href={mailtoHref} />
      </p>
    </form>
  )
}
