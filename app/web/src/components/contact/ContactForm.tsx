'use client'

import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type InputEvent,
  type SubmitEvent,
} from 'react'

import { BookingCta } from '@/components/layout/BookingCta'
import { Stagger } from '@/components/motion/Stagger'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import { fieldVariants } from '@/components/ui/field'
import { contactLabCopy } from '@/content/lab/copy'
import { site } from '@/content/site'
import { ui } from '@/content/ui'
import { inlineLink, inlineLinkDescendant } from '@/components/ui/inline-link'
import { cn } from '@/lib/cn'
import {
  contactMailtoHref,
  submitContact,
  validateContact,
  type ContactError,
  type ContactErrors,
  type ContactRequest,
} from '@/lib/contact'
import { labMailtoHref } from '@/lib/labResult'
import { formatPhoneDigits, NATIONAL_LENGTH } from '@/lib/phone'

import { ContactReceipt } from './ContactReceipt'
import {
  contactCharge,
  contactSignal,
  messageFill,
  type ContactPhase,
} from './contactSignal'
import { SentToast } from './SentToast'
import { useLabPrefill } from './useLabPrefill'

function syncMessageFill(form: HTMLFormElement | null) {
  const field = form?.querySelector<HTMLElement>('[data-message-field]')
  const textarea = form?.querySelector<HTMLTextAreaElement>('#message')
  if (!field || !textarea) return
  const fill = messageFill(textarea.value)
  field.style.setProperty('--fill', String(fill))
  if (fill === 1) field.dataset.met = 'true'
  else delete field.dataset.met
}

function fieldValue(form: HTMLFormElement, id: string): string {
  return form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)?.value ?? ''
}

function syncProgress(form: HTMLFormElement | null) {
  syncMessageFill(form)
  if (!form) return
  contactSignal.setCharge(
    contactCharge({
      name: fieldValue(form, 'name'),
      email: fieldValue(form, 'email'),
      phone: fieldValue(form, 'phone'),
      message: fieldValue(form, 'message'),
    }),
  )
}

function readRequest(form: HTMLFormElement, openedAt: number): ContactRequest {
  const data = new FormData(form)
  const field = (key: string) => {
    const value = data.get(key)
    return typeof value === 'string' ? value : ''
  }
  return {
    name: field('name'),
    email: field('email'),
    phone: field('phone'),
    company: field('company'),
    message: field('message'),
    budget: field('budget'),
    honeypot: field('honeypot'),
    elapsedMs: Date.now() - openedAt,
  }
}

const VALIDATED_FIELDS = ['name', 'email', 'phone', 'message'] as const

type ValidatedField = (typeof VALIDATED_FIELDS)[number]

function validatedField(target: EventTarget): ValidatedField | null {
  if (!(target instanceof HTMLElement)) return null
  return VALIDATED_FIELDS.find((field) => field === target.id) ?? null
}

function withFieldError(
  errors: ContactErrors,
  field: ValidatedField,
  error: string | undefined,
): ContactErrors {
  if (errors[field] === error) return errors
  if (error !== undefined) return { ...errors, [field]: error }
  return Object.fromEntries(Object.entries(errors).filter(([key]) => key !== field))
}

function isSubmitButton(target: EventTarget | null): boolean {
  return target instanceof HTMLButtonElement && target.type === 'submit'
}

function digitsIn(text: string): string {
  return text.replace(/\D/g, '')
}

function dropNeighbourDigit(digits: string, before: number, inputType: string) {
  if (inputType === 'deleteContentBackward' && before > 0) {
    return {
      digits: digits.slice(0, before - 1) + digits.slice(before),
      before: before - 1,
    }
  }
  if (inputType === 'deleteContentForward') {
    return { digits: digits.slice(0, before) + digits.slice(before + 1), before }
  }
  return { digits, before }
}

function caretAfterDigits(formatted: string, count: number): number {
  if (count === 0) return 0
  let seen = 0
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted.charAt(index))) seen += 1
    if (seen === count) return index + 1
  }
  return formatted.length
}

function isInsertion(typed: string, before: number, previous: string): boolean {
  const added = typed.length - previous.length
  if (added <= 0 || before < added) return false
  return typed.slice(0, before - added) + typed.slice(before) === previous
}

function hasCountryCode(typed: string, previous: string): boolean {
  return (
    typed.startsWith('1') && (typed.length === NATIONAL_LENGTH + 1 || previous === '')
  )
}

function nextPhoneDigits(
  typed: string,
  before: number,
  previous: string,
  inputType: string,
) {
  if (typed === previous) return dropNeighbourDigit(typed, before, inputType)
  if (previous.length >= NATIONAL_LENGTH && isInsertion(typed, before, previous)) {
    return { digits: previous, before: before - (typed.length - previous.length) }
  }
  if (hasCountryCode(typed, previous)) {
    return { digits: typed.slice(1), before: Math.max(before - 1, 0) }
  }
  return { digits: typed, before }
}

function formatPhoneInput(input: HTMLInputElement, inputType: string, previous: string) {
  const caret = input.selectionStart ?? input.value.length
  const { digits, before } = nextPhoneDigits(
    digitsIn(input.value),
    digitsIn(input.value.slice(0, caret)).length,
    digitsIn(previous),
    inputType,
  )
  const national = digits.slice(0, NATIONAL_LENGTH)
  const formatted = formatPhoneDigits(national)
  if (formatted === input.value) return
  const count = Math.min(before, national.length)
  input.value = formatted
  if (input.ownerDocument.activeElement !== input) return
  const position = caretAfterDigits(formatted, count)
  input.setSelectionRange(position, position)
}

const LABEL =
  'mb-1 block text-sm text-text motion-on:transition-colors motion-on:duration-(--duration-pointer) group-focus-within/field:text-accent'

const STATUS_WRAP = cn(
  inlineLinkDescendant,
  String.raw`group-data-[error=daily\_cap]/form:rounded-r-lg group-data-[error=daily\_cap]/form:border-l-2 group-data-[error=daily\_cap]/form:border-brand group-data-[error=daily\_cap]/form:bg-brand/5 group-data-[error=daily\_cap]/form:py-3 group-data-[error=daily\_cap]/form:pl-4 group-data-[error=daily\_cap]/form:[&>p]:text-text`,
  'group-data-[error=server]/form:rounded-r-lg group-data-[error=server]/form:border-l-2 group-data-[error=server]/form:border-brand group-data-[error=server]/form:bg-brand/5 group-data-[error=server]/form:py-3 group-data-[error=server]/form:pl-4 group-data-[error=server]/form:[&>p]:text-text',
  String.raw`group-data-[error=rate\_limit]/form:border-l-2 group-data-[error=rate\_limit]/form:border-border-strong group-data-[error=rate\_limit]/form:pl-4`,
  String.raw`group-data-[error=too\_fast]/form:border-l-2 group-data-[error=too\_fast]/form:border-border-strong group-data-[error=too\_fast]/form:pl-4`,
  'group-data-[error=validation]/form:[&>p]:text-brand',
  'group-data-[status=sent]/form:[&>p]:text-text',
)

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
  const [status, setStatusState] = useState<ContactPhase>('idle')
  const [message, setMessage] = useState('')
  const [mailtoHref, setMailtoHref] = useState<string | null>(null)
  const [errorKind, setErrorKind] = useState<ContactError | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  const [validationRun, setValidationRun] = useState(0)
  const sending = status === 'sending'
  const formRef = useRef<HTMLFormElement>(null)
  const openedAt = useRef(0)
  const mounted = useRef(false)
  const dirty = useRef(new Set<ValidatedField>())
  const phoneValue = useRef('')
  const pressingSubmit = useRef(false)
  const prefill = useLabPrefill()

  useEffect(() => {
    openedAt.current = Date.now()
  }, [])

  useEffect(() => {
    mounted.current = true
    contactSignal.reset()
    return () => {
      mounted.current = false
      contactSignal.reset()
    }
  }, [])

  useEffect(() => {
    if (validationRun === 0) return
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [validationRun])

  useEffect(() => {
    syncProgress(formRef.current)
  }, [prefill])

  function setStatus(next: ContactPhase) {
    setStatusState(next)
    contactSignal.setPhase(next)
  }

  if (endpoint === null) {
    return (
      <div>
        {prefill !== null && <p className="mb-4 text-text">{contactLabCopy.added}</p>}
        <p className="text-lg text-text">{ui.contactNotLive}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
          <a
            href={`mailto:${site.contactEmail}`}
            className={cn(inlineLink, 'font-mono text-xl break-all sm:text-display-sm')}
          >
            {site.contactEmail}
          </a>
          <CopyButton
            value={site.contactEmail}
            label={ui.contactCopyEmail}
            copiedLabel={ui.contactCopied}
            failedLabel={ui.contactCopyFailed}
          />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <BookingCta />
          {prefill !== null && (
            <a href={labMailtoHref(site.contactEmail, prefill)} className={inlineLink}>
              {contactLabCopy.emailResults}
            </a>
          )}
        </div>
      </div>
    )
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    pressingSubmit.current = false
    if (status === 'sending' || status === 'sent') return
    const request = readRequest(event.currentTarget, openedAt.current)

    const found = validateContact(request)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setValidationRun((count) => count + 1)
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
    if (!mounted.current) return

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

  function fieldError(form: HTMLFormElement, field: ValidatedField) {
    return validateContact(readRequest(form, openedAt.current))[field]
  }

  function onFieldInput(event: InputEvent<HTMLFormElement>) {
    const field = validatedField(event.target)
    if (field === null) return
    dirty.current.add(field)
    if (errors[field] === undefined) return
    const error = fieldError(event.currentTarget, field)
    setErrors((current) =>
      current[field] === undefined ? current : withFieldError(current, field, error),
    )
  }

  function onFieldBlur(event: FocusEvent<HTMLFormElement>) {
    const field = validatedField(event.target)
    if (field === null || !dirty.current.has(field)) return
    if (pressingSubmit.current || isSubmitButton(event.relatedTarget)) return
    const error = fieldError(event.currentTarget, field)
    setErrors((current) => withFieldError(current, field, error))
  }

  function onSubmitPointerDown() {
    pressingSubmit.current = true
    const release = () => {
      pressingSubmit.current = false
      window.removeEventListener('click', release, true)
      window.removeEventListener('pointercancel', release, true)
    }
    window.addEventListener('click', release, true)
    window.addEventListener('pointercancel', release, true)
  }

  function onPhoneInput(event: InputEvent<HTMLInputElement>) {
    formatPhoneInput(event.currentTarget, event.nativeEvent.inputType, phoneValue.current)
    phoneValue.current = event.currentTarget.value
  }

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        void onSubmit(event)
      }}
      noValidate
      onInput={(event) => {
        syncProgress(event.currentTarget)
        onFieldInput(event)
      }}
      onBlur={onFieldBlur}
      data-status={status}
      data-error={errorKind ?? undefined}
      aria-busy={sending}
      className="group/form space-y-5"
    >
      {prefill !== null && (
        <div
          data-lab-strip=""
          className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border-l-2 border-accent bg-elevated px-4 py-3"
        >
          <p className="text-text">{contactLabCopy.added}</p>
          <BookingCta variant="link" size="sm" />
        </div>
      )}

      <div
        inert={status === 'sent'}
        className="grid grid-rows-[1fr] group-data-[status=sent]/form:grid-rows-[0fr] group-data-[status=sent]/form:motion-reduce:hidden motion-on:transition-[grid-template-rows] motion-on:duration-(--duration-scene) motion-on:ease-(--ease-route)"
      >
        <div className="min-h-0 space-y-5 group-data-[status=sent]/form:overflow-hidden">
          <Stagger>
            <div className="group/field">
              <label htmlFor="name" className={LABEL}>
                {ui.contactLabelName}
              </label>
              <input
                id="name"
                name="name"
                autoComplete="name"
                required
                placeholder={ui.contactPlaceholderName}
                readOnly={sending}
                className={fieldVariants({ kind: 'input' })}
                aria-invalid={errors.name !== undefined}
                aria-describedby={errors.name === undefined ? undefined : 'name-error'}
              />
              {errors.name !== undefined && (
                <p
                  id="name-error"
                  className="mt-1 text-sm text-brand motion-on:animate-[field-error_var(--duration-pointer)_var(--ease-pointer)_backwards]"
                >
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
                required
                placeholder={ui.contactPlaceholderEmail}
                readOnly={sending}
                className={fieldVariants({ kind: 'input' })}
                aria-invalid={errors.email !== undefined}
                aria-describedby={errors.email === undefined ? undefined : 'email-error'}
              />
              {errors.email !== undefined && (
                <p
                  id="email-error"
                  className="mt-1 text-sm text-brand motion-on:animate-[field-error_var(--duration-pointer)_var(--ease-pointer)_backwards]"
                >
                  {errors.email}
                </p>
              )}
            </div>
            <div className="group/field">
              <label htmlFor="phone" className={LABEL}>
                {ui.contactLabelPhone}
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                placeholder={ui.contactPlaceholderPhone}
                readOnly={sending}
                onInput={onPhoneInput}
                className={fieldVariants({ kind: 'input' })}
                aria-invalid={errors.phone !== undefined}
                aria-describedby={
                  errors.phone === undefined ? 'phone-hint' : 'phone-hint phone-error'
                }
              />
              <p id="phone-hint" className="mt-1 text-sm text-muted">
                {ui.contactPhoneHint}
              </p>
              {errors.phone !== undefined && (
                <p
                  id="phone-error"
                  className="mt-1 text-sm text-brand motion-on:animate-[field-error_var(--duration-pointer)_var(--ease-pointer)_backwards]"
                >
                  {errors.phone}
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
                placeholder={ui.contactPlaceholderCompany}
                readOnly={sending}
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
            <div className="group/field" data-message-field="">
              <label htmlFor="message" className={LABEL}>
                {ui.contactLabelMessage}
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                key={prefill ?? 'empty'}
                defaultValue={prefill ?? undefined}
                required
                placeholder={ui.contactPlaceholderMessage}
                readOnly={sending}
                className={fieldVariants({ kind: 'textarea' })}
                aria-invalid={errors.message !== undefined}
                aria-describedby={
                  errors.message === undefined ? undefined : 'message-error'
                }
              />
              {errors.message !== undefined && (
                <p
                  id="message-error"
                  className="mt-1 text-sm text-brand motion-on:animate-[field-error_var(--duration-pointer)_var(--ease-pointer)_backwards]"
                >
                  {errors.message}
                </p>
              )}
              <span
                aria-hidden="true"
                data-message-track=""
                className="mt-1 block h-0.5 overflow-hidden rounded-full bg-border"
              >
                <span
                  data-message-bar=""
                  className="block h-full origin-left scale-x-[var(--fill,0)] bg-border-strong group-data-[met=true]/field:bg-accent motion-on:transition-[transform,background-color] motion-on:duration-(--duration-pointer) motion-on:ease-(--ease-pointer)"
                />
              </span>
            </div>
          </Stagger>

          <div
            className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
            aria-hidden="true"
          >
            <label htmlFor="honeypot">{ui.contactHoneypotLabel}</label>
            <input
              id="honeypot"
              name="honeypot"
              tabIndex={-1}
              aria-hidden="true"
              autoComplete="off"
            />
          </div>

          <div
            className={cn(
              'relative flex items-center gap-4',
              sending && 'cursor-progress',
            )}
          >
            <Button
              type="submit"
              onPointerDown={onSubmitPointerDown}
              aria-disabled={sending || status === 'sent'}
              className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50 group-data-[status=sending]/form:aria-disabled:cursor-progress group-data-[status=sending]/form:aria-disabled:opacity-100"
            >
              {sending ? ui.formSending : ui.formSubmit}
            </Button>
            {sending && (
              <span
                aria-hidden="true"
                data-send-track=""
                className="absolute inset-x-0 -bottom-2 h-0.5 overflow-hidden rounded-full bg-border"
              >
                <span
                  data-send-bar=""
                  className="block h-full w-full bg-accent motion-on:animate-[send-sweep_calc(var(--duration-standard)*4)_linear_infinite]"
                />
              </span>
            )}
          </div>
        </div>
      </div>

      <div data-status-wrap="" className={STATUS_WRAP}>
        <p role="status" aria-live="polite" className="text-sm text-muted">
          <StatusText text={message} href={mailtoHref} />
        </p>
      </div>
      {status === 'sent' && <ContactReceipt reference={reference} />}
      {status === 'sent' && <SentToast />}
    </form>
  )
}
