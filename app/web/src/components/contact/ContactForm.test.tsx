import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactForm } from './ContactForm'
import { site } from '@/content/site'
import { ui } from '@/content/ui'
import { contactMailtoHref } from '@/lib/contact'
import { signedPostJson } from '@/lib/signedPost'

vi.mock('@/lib/signedPost', () => ({ signedPostJson: vi.fn() }))

describe('ContactForm with no endpoint configured', () => {
  it('shows a real way to make contact instead of a dead button', () => {
    render(<ContactForm endpoint={null} />)
    expect(screen.queryByRole('button', { name: ui.formSubmit })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /mccorlabs\.com/i })).toHaveAttribute(
      'href',
      `mailto:${site.contactEmail}`,
    )
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
