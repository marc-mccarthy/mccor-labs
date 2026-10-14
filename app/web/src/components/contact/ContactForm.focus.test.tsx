import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactForm } from './ContactForm'
import { ui } from '@/content/ui'
import { signedPostJson } from '@/lib/signedPost'

vi.mock('@/lib/signedPost', () => ({ signedPostJson: vi.fn() }))

function submitButton() {
  return screen.getByRole('button', { name: ui.formSubmit })
}

async function fillName() {
  await userEvent.type(screen.getByLabelText(/name/i), 'Ada Lovelace')
}

async function fillEmail() {
  await userEvent.type(screen.getByLabelText(/email/i), 'ada@example.com')
}

async function fillMessage() {
  await userEvent.type(
    screen.getByLabelText(/message/i),
    'We need a marketing site and a portal.',
  )
}

async function fillValidForm() {
  await fillName()
  await fillEmail()
  await fillMessage()
}

describe('ContactForm focus and resubmit', () => {
  beforeEach(() => {
    vi.mocked(signedPostJson).mockReset()
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  it('focuses the name field when the name is empty', async () => {
    render(<ContactForm endpoint="/api/contact" />)
    await userEvent.click(submitButton())
    expect(document.getElementById('name')).toHaveFocus()
  })

  it('focuses only the email field when the email is bad', async () => {
    render(<ContactForm endpoint="/api/contact" />)
    await fillName()
    await fillMessage()
    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email')
    await userEvent.click(submitButton())
    expect(document.getElementById('email')).toHaveFocus()
    expect(document.getElementById('name')).not.toHaveFocus()
    expect(document.getElementById('message')).not.toHaveFocus()
  })

  it('keeps focus on the submit button once sent and blocks a second post', async () => {
    vi.mocked(signedPostJson).mockResolvedValue(
      new Response(JSON.stringify({ ok: true, reference: 'AB12CD34' }), { status: 200 }),
    )
    render(<ContactForm endpoint="/api/contact" />)
    await fillValidForm()
    await userEvent.click(submitButton())
    await screen.findByText(new RegExp(ui.formSuccess))
    expect(submitButton()).toHaveFocus()
    expect(submitButton()).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(submitButton())
    expect(signedPostJson).toHaveBeenCalledTimes(1)
    expect(submitButton()).toHaveFocus()
  })

  it('clears aria-disabled when the sender types after sent', async () => {
    vi.mocked(signedPostJson).mockResolvedValue(new Response('{}', { status: 200 }))
    render(<ContactForm endpoint="/api/contact" />)
    await fillValidForm()
    await userEvent.click(submitButton())
    await screen.findByText(new RegExp(ui.formSuccess))
    expect(submitButton()).toHaveAttribute('aria-disabled', 'true')
    await userEvent.type(screen.getByLabelText(/message/i), ' More detail.')
    expect(submitButton()).toHaveAttribute('aria-disabled', 'false')
  })

  it('keeps focus on the submit button after a server error', async () => {
    vi.mocked(signedPostJson).mockResolvedValue(
      new Response(JSON.stringify({ reason: 'server' }), { status: 500 }),
    )
    render(<ContactForm endpoint="/api/contact" />)
    await fillValidForm()
    await userEvent.click(submitButton())
    expect(await screen.findByRole('status')).toHaveTextContent(ui.formErrorServer)
    expect(submitButton()).toHaveFocus()
  })

  it('sets autocomplete tokens and turns it off on the honeypot', () => {
    render(<ContactForm endpoint="/api/contact" />)
    expect(document.getElementById('name')).toHaveAttribute('autocomplete', 'name')
    expect(document.getElementById('email')).toHaveAttribute('autocomplete', 'email')
    expect(document.getElementById('company')).toHaveAttribute(
      'autocomplete',
      'organization',
    )
    expect(document.getElementById('honeypot')).toHaveAttribute('autocomplete', 'off')
  })

  it('caps the company field at the 100 characters validation allows', () => {
    render(<ContactForm endpoint="/api/contact" />)
    expect(document.getElementById('company')).toHaveAttribute('maxlength', '100')
  })
})
