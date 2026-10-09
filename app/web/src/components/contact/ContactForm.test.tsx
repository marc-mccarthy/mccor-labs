import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactForm } from './ContactForm'
import { contactLabCopy } from '@/content/lab/copy'
import { EMPTY_ANSWERS, RUBRIC_VERSION, classifyStep } from '@/content/lab/rubric'
import { site } from '@/content/site'
import { ui } from '@/content/ui'
import { contactMailtoHref } from '@/lib/contact'
import { encodeLabResult, toLabResult } from '@/lib/labResult'
import { signedPostJson } from '@/lib/signedPost'

vi.mock('@/lib/signedPost', () => ({ signedPostJson: vi.fn() }))

function bookingLinks() {
  return [ui.bookCall, ui.contactFallback].flatMap((name) =>
    screen.queryAllByRole('link', { name }),
  )
}

describe('ContactForm with no endpoint configured', () => {
  it('shows a real way to make contact instead of a dead button', () => {
    render(<ContactForm endpoint={null} />)
    expect(screen.queryByRole('button', { name: ui.formSubmit })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /mccorlabs\.com/i })).toHaveAttribute(
      'href',
      `mailto:${site.contactEmail}`,
    )
    expect(screen.queryByText(contactLabCopy.added)).not.toBeInTheDocument()
    expect(bookingLinks()).toHaveLength(1)
  })
})

describe('ContactForm with an endpoint', () => {
  beforeEach(() => {
    vi.mocked(signedPostJson).mockReset()
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  it('labels every field', () => {
    render(<ContactForm endpoint="https://api.test/contact" />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
  })

  it('shows no lab notice and no booking link without lab results', () => {
    render(<ContactForm endpoint="https://api.test/contact" />)
    expect(screen.queryByText(contactLabCopy.added)).not.toBeInTheDocument()
    expect(bookingLinks()).toHaveLength(0)
    expect(screen.getByLabelText(/message/i)).toHaveValue('')
  })

  it('shows inline errors and does not fetch when the form is invalid', async () => {
    render(<ContactForm endpoint="https://api.test/contact" />)
    await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
    expect(await screen.findByText(ui.contactErrorName)).toBeInTheDocument()
    expect(signedPostJson).not.toHaveBeenCalled()
  })

  async function fillValidForm() {
    await userEvent.type(screen.getByLabelText(/name/i), 'Ada Lovelace')
    await userEvent.type(screen.getByLabelText(/email/i), 'ada@example.com')
    await userEvent.type(
      screen.getByLabelText(/message/i),
      'We need a marketing site and a portal.',
    )
  }

  it('announces success with the reference in a live region', async () => {
    vi.mocked(signedPostJson).mockResolvedValue(
      new Response(JSON.stringify({ ok: true, reference: 'AB12CD34' }), { status: 200 }),
    )
    render(<ContactForm endpoint="/api/contact" />)
    await fillValidForm()
    await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(ui.formSuccess)
    expect(status).toHaveTextContent('AB12CD34')
  })

  it('sends how long the form was open', async () => {
    vi.mocked(signedPostJson).mockResolvedValue(new Response('{}', { status: 200 }))
    render(<ContactForm endpoint="/api/contact" />)
    await fillValidForm()
    await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
    expect(signedPostJson).toHaveBeenCalledWith(
      '/api/contact',
      expect.objectContaining({ elapsedMs: expect.any(Number) as number }),
    )
  })

  it.each([
    ['daily cap', 429, 'daily_cap', ui.formErrorDailyCap],
    ['server error', 500, 'server', ui.formErrorServer],
  ])(
    'shows the %s message with a mailto link and keeps what was typed',
    async (_label, status, reason, text) => {
      vi.mocked(signedPostJson).mockResolvedValue(
        new Response(JSON.stringify({ reason }), { status }),
      )
      render(<ContactForm endpoint="/api/contact" />)
      await fillValidForm()
      await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
      const statusLine = await screen.findByRole('status')
      expect(statusLine).toHaveTextContent(text)
      const link = within(statusLine).getByRole('link', { name: site.contactEmail })
      expect(link).toHaveAttribute(
        'href',
        contactMailtoHref(
          site.contactEmail,
          ui.formMailtoSubject,
          'We need a marketing site and a portal.',
        ),
      )
      expect(screen.getByLabelText(/message/i)).toHaveValue(
        'We need a marketing site and a portal.',
      )
    },
  )

  it('asks a too-fast sender to press Send again, with no link', async () => {
    vi.mocked(signedPostJson).mockResolvedValue(
      new Response(JSON.stringify({ reason: 'too_fast' }), { status: 400 }),
    )
    render(<ContactForm endpoint="/api/contact" />)
    await fillValidForm()
    await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
    const statusLine = await screen.findByRole('status')
    expect(statusLine).toHaveTextContent(ui.formErrorTooFast)
    expect(within(statusLine).queryByRole('link')).toBeNull()
  })

  it('keeps the honeypot out of the tab order', () => {
    render(<ContactForm endpoint="https://api.test/contact" />)
    const honeypot = document.querySelector('input[name="honeypot"]')
    expect(honeypot).toHaveAttribute('tabindex', '-1')
    expect(honeypot).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('ContactForm with lab results in the fragment', () => {
  const encoded = encodeLabResult(
    toLabResult(
      [{ name: 'A', result: classifyStep(EMPTY_ANSWERS), answers: EMPTY_ANSWERS }],
      false,
    ),
  )

  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('pre-fills the message and says so', () => {
    window.history.replaceState(null, '', `/contact/#lab=${encoded}`)
    render(<ContactForm endpoint="https://api.test/contact" />)
    expect(screen.getByLabelText(/message/i)).toHaveValue(
      `Results from Should This Be AI? (the wrong-tool test)\nStep 1: not answered yet (rule R1, rubric ${RUBRIC_VERSION})\nWhat I would like help with: `,
    )
    expect(screen.getByText(contactLabCopy.added)).toBeInTheDocument()
    expect(bookingLinks()).toHaveLength(1)
    expect(window.location.hash).toBe('')
  })

  it('puts the results in a mailto body when no endpoint is set', () => {
    window.history.replaceState(null, '', `/contact/#lab=${encoded}`)
    render(<ContactForm endpoint={null} />)
    const link = screen.getByRole('link', { name: contactLabCopy.emailResults })
    expect(link.getAttribute('href')).toMatch(/^mailto:.+\?subject=.+&body=Results/)
    expect(screen.getByText(contactLabCopy.added)).toBeInTheDocument()
    expect(bookingLinks()).toHaveLength(1)
    expect(screen.getByRole('link', { name: /mccorlabs\.com/i })).toHaveAttribute(
      'href',
      `mailto:${site.contactEmail}`,
    )
    expect(window.location.hash).toBe('')
  })

  it('leaves the message empty for a malformed fragment', () => {
    window.history.replaceState(null, '', '/contact/#lab=garbage')
    render(<ContactForm endpoint="https://api.test/contact" />)
    expect(screen.getByLabelText(/message/i)).toHaveValue('')
    expect(screen.queryByText(contactLabCopy.added)).not.toBeInTheDocument()
  })
})
