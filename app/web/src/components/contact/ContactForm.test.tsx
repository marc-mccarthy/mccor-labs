import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
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
    expect(screen.getByLabelText(ui.contactLabelPhone)).toBeInTheDocument()
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
  })

  it('shows a placeholder in every text field', () => {
    render(<ContactForm endpoint="https://api.test/contact" />)
    expect(screen.getByLabelText(/name/i)).toHaveAttribute(
      'placeholder',
      ui.contactPlaceholderName,
    )
    expect(screen.getByLabelText(/email/i)).toHaveAttribute(
      'placeholder',
      ui.contactPlaceholderEmail,
    )
    expect(screen.getByLabelText(ui.contactLabelPhone)).toHaveAttribute(
      'placeholder',
      ui.contactPlaceholderPhone,
    )
    expect(screen.getByLabelText(/company/i)).toHaveAttribute(
      'placeholder',
      ui.contactPlaceholderCompany,
    )
    expect(screen.getByLabelText(/message/i)).toHaveAttribute(
      'placeholder',
      ui.contactPlaceholderMessage,
    )
  })

  it('marks name, email, phone and message as required and leaves the optional fields alone', () => {
    render(<ContactForm endpoint="https://api.test/contact" />)
    expect(screen.getByLabelText(/name/i)).toBeRequired()
    expect(screen.getByLabelText(/email/i)).toBeRequired()
    expect(screen.getByLabelText(ui.contactLabelPhone)).toBeRequired()
    expect(screen.getByLabelText(/message/i)).toBeRequired()
    expect(screen.getByLabelText(/company/i)).not.toBeRequired()
    expect(screen.getByLabelText(/budget/i)).not.toBeRequired()
    expect(document.querySelector('form')).toHaveAttribute('novalidate')
  })

  it('makes the phone field a tel input with a described hint and no length cap', () => {
    render(<ContactForm endpoint="https://api.test/contact" />)
    const phone = screen.getByLabelText(ui.contactLabelPhone)
    expect(phone).toHaveAttribute('type', 'tel')
    expect(phone).toHaveAttribute('autocomplete', 'tel')
    expect(phone).toHaveAttribute('name', 'phone')
    expect(phone).not.toHaveAttribute('maxlength')
    expect(phone).toHaveAttribute('aria-invalid', 'false')
    expect(phone).toHaveAccessibleDescription(ui.contactPhoneHint)
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
    expect(screen.getByText(ui.contactErrorPhone)).toBeInTheDocument()
    expect(signedPostJson).not.toHaveBeenCalled()
  })

  it('rejects a phone number that is not a valid US or Canadian number', async () => {
    render(<ContactForm endpoint="https://api.test/contact" />)
    await fillValidForm()
    const phone = screen.getByLabelText(ui.contactLabelPhone)
    await userEvent.clear(phone)
    await userEvent.type(phone, '1025550123')
    await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
    expect(await screen.findByText(ui.contactErrorPhoneInvalid)).toBeInTheDocument()
    expect(phone).toHaveAttribute('aria-invalid', 'true')
    expect(phone).toHaveAttribute('aria-describedby', 'phone-hint phone-error')
    expect(phone).toHaveFocus()
    expect(signedPostJson).not.toHaveBeenCalled()
  })

  async function fillValidForm() {
    await userEvent.type(screen.getByLabelText(/name/i), 'Ada Lovelace')
    await userEvent.type(screen.getByLabelText(/email/i), 'ada@example.com')
    await userEvent.type(screen.getByLabelText(ui.contactLabelPhone), '2025550123')
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

  it('sends the phone number in E.164', async () => {
    vi.mocked(signedPostJson).mockResolvedValue(new Response('{}', { status: 200 }))
    render(<ContactForm endpoint="/api/contact" />)
    await fillValidForm()
    await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
    expect(signedPostJson).toHaveBeenCalledWith(
      '/api/contact',
      expect.objectContaining({ phone: '+12025550123' }),
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

function phoneInput(): HTMLInputElement {
  const phone = screen.getByLabelText(ui.contactLabelPhone)
  if (!(phone instanceof HTMLInputElement)) throw new Error('phone is not an input')
  return phone
}

describe('ContactForm phone formatting', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    render(<ContactForm endpoint="/api/contact" />)
  })

  it('formats digits as they are typed with no trailing separator', async () => {
    const phone = phoneInput()
    await userEvent.type(phone, '202')
    expect(phone).toHaveValue('202')
    await userEvent.type(phone, '5')
    expect(phone).toHaveValue('(202) 5')
    await userEvent.type(phone, '550123')
    expect(phone).toHaveValue('(202) 555-0123')
    expect(phone.selectionStart).toBe(14)
  })

  it('formats a pasted international number', async () => {
    const phone = phoneInput()
    await userEvent.click(phone)
    await userEvent.paste('+1 (202) 555-0123')
    expect(phone).toHaveValue('(202) 555-0123')
  })

  it('formats an autofilled E.164 number', () => {
    const phone = phoneInput()
    fireEvent.input(phone, { target: { value: '+12025550123' } })
    expect(phone).toHaveValue('(202) 555-0123')
  })

  it('ignores letters and digits past ten', async () => {
    const phone = phoneInput()
    await userEvent.type(phone, '202a55501239')
    expect(phone).toHaveValue('(202) 555-0123')
  })

  it.each([
    ['after the area code', 6, '(205) 550-123', 3],
    ['after the dash', 10, '(202) 550-123', 8],
  ])(
    'deletes the digit before a separator on backspace %s',
    async (_label, caret, value, after) => {
      const phone = phoneInput()
      await userEvent.type(phone, '2025550123')
      await userEvent.type(phone, '{Backspace}', {
        initialSelectionStart: caret,
        initialSelectionEnd: caret,
      })
      expect(phone).toHaveValue(value)
      expect(phone.selectionStart).toBe(after)
    },
  )

  it('deletes the digit after a separator on forward delete', async () => {
    const phone = phoneInput()
    await userEvent.type(phone, '2025550123')
    await userEvent.type(phone, '{Delete}', {
      initialSelectionStart: 4,
      initialSelectionEnd: 4,
    })
    expect(phone).toHaveValue('(202) 550-123')
    expect(phone.selectionStart).toBe(4)
  })

  it('keeps the caret after the edited digit in the middle', async () => {
    const phone = phoneInput()
    await userEvent.type(phone, '202555012')
    await userEvent.type(phone, '9', { initialSelectionStart: 2, initialSelectionEnd: 2 })
    expect(phone).toHaveValue('(290) 255-5012')
    expect(phone.selectionStart).toBe(3)
    await userEvent.keyboard('{Backspace}')
    expect(phone).toHaveValue('(202) 555-012')
    expect(phone.selectionStart).toBe(2)
  })

  it('keeps a real leading 1 when the first digit is deleted', async () => {
    const phone = phoneInput()
    await userEvent.type(phone, '2125550123')
    await userEvent.type(phone, '{Backspace}', {
      initialSelectionStart: 2,
      initialSelectionEnd: 2,
    })
    expect(phone).toHaveValue('(125) 550-123')
    expect(phone.selectionStart).toBe(0)
  })

  it('drops a typed country code from an empty field', async () => {
    const phone = phoneInput()
    await userEvent.type(phone, '12025550123')
    expect(phone).toHaveValue('(202) 555-0123')
  })

  it('drops the country code when pasting over a selected number', async () => {
    const phone = phoneInput()
    await userEvent.type(phone, '3125550199')
    phone.setSelectionRange(0, phone.value.length)
    await userEvent.paste('1-202-555-0123')
    expect(phone).toHaveValue('(202) 555-0123')
  })

  it('drops the country code from an autofill that replaces a number', () => {
    const phone = phoneInput()
    fireEvent.input(phone, { target: { value: '312' } })
    fireEvent.input(phone, { target: { value: '+12025550123' } })
    expect(phone).toHaveValue('(202) 555-0123')
  })

  it('ignores digits added to a full number', async () => {
    const phone = phoneInput()
    await userEvent.click(phone)
    await userEvent.paste('11234567890')
    expect(phone).toHaveValue('(123) 456-7890')
    await userEvent.type(phone, '0')
    expect(phone).toHaveValue('(123) 456-7890')
    await userEvent.type(phone, '5', { initialSelectionStart: 2, initialSelectionEnd: 2 })
    expect(phone).toHaveValue('(123) 456-7890')
    expect(phone.selectionStart).toBe(2)
  })
})

describe('ContactForm blur validation', () => {
  beforeEach(() => {
    vi.mocked(signedPostJson).mockReset()
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    render(<ContactForm endpoint="/api/contact" />)
  })

  it('shows nothing when tabbing through untouched empty fields', async () => {
    await userEvent.click(screen.getByLabelText(/name/i))
    for (let step = 0; step < 6; step += 1) await userEvent.tab()
    expect(document.querySelectorAll('[id$="-error"]')).toHaveLength(0)
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
  })

  it('shows the phone error on blur once the phone was typed in', async () => {
    const phone = phoneInput()
    await userEvent.type(phone, '20255')
    expect(screen.queryByText(ui.contactErrorPhoneInvalid)).toBeNull()
    await userEvent.tab()
    expect(screen.getByText(ui.contactErrorPhoneInvalid)).toBeInTheDocument()
    expect(phone).toHaveAttribute('aria-invalid', 'true')
    expect(phone).toHaveAttribute('aria-describedby', 'phone-hint phone-error')
    expect(phone).not.toHaveFocus()
  })

  it('shows only the email error on blur of a dirty email', async () => {
    const email = screen.getByLabelText(/email/i)
    await userEvent.type(email, 'ada@example')
    await userEvent.tab()
    expect(screen.getByText(ui.contactErrorEmail)).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-describedby', 'email-error')
    expect(screen.queryByText(ui.contactErrorName)).toBeNull()
    expect(screen.queryByText(ui.contactErrorPhone)).toBeNull()
  })

  it('clears an error on input once the field is valid and never adds one on input', async () => {
    const phone = phoneInput()
    await userEvent.type(phone, '202')
    await userEvent.tab()
    expect(screen.getByText(ui.contactErrorPhoneInvalid)).toBeInTheDocument()
    await userEvent.type(phone, '555012')
    expect(screen.getByText(ui.contactErrorPhoneInvalid)).toBeInTheDocument()
    await userEvent.type(phone, '3')
    expect(screen.queryByText(ui.contactErrorPhoneInvalid)).toBeNull()
    expect(phone).toHaveAttribute('aria-describedby', 'phone-hint')
    await userEvent.type(phone, '{Backspace}')
    expect(screen.queryByText(ui.contactErrorPhoneInvalid)).toBeNull()
    expect(phone).toHaveAttribute('aria-invalid', 'false')
  })

  it('updates a shown error as the field changes', async () => {
    await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
    expect(screen.getByText(ui.contactErrorPhone)).toBeInTheDocument()
    const phone = phoneInput()
    await userEvent.type(phone, '2')
    expect(screen.queryByText(ui.contactErrorPhone)).toBeNull()
    expect(screen.getByText(ui.contactErrorPhoneInvalid)).toBeInTheDocument()
    expect(phone).toHaveAttribute('aria-describedby', 'phone-hint phone-error')
    await userEvent.type(phone, '025550123')
    expect(screen.queryByText(ui.contactErrorPhoneInvalid)).toBeNull()
    await userEvent.type(screen.getByLabelText(/company/i), 'Acme')
    expect(screen.queryByText(ui.contactErrorCompanyLength)).toBeNull()
  })

  it('lets a click on Send through from a dirty field and validates every field', async () => {
    const phone = phoneInput()
    await userEvent.type(phone, '20255')
    await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
    expect(screen.getByText(ui.contactErrorName)).toBeInTheDocument()
    expect(screen.getByText(ui.contactErrorEmail)).toBeInTheDocument()
    expect(screen.getByText(ui.contactErrorPhoneInvalid)).toBeInTheDocument()
    expect(screen.getByText(ui.contactErrorMessage)).toBeInTheDocument()
    expect(document.getElementById('name')).toHaveFocus()
    expect(signedPostJson).not.toHaveBeenCalled()
  })

  it('skips blur validation when focus moves to the submit button', () => {
    const phone = phoneInput()
    fireEvent.input(phone, { target: { value: '20255' } })
    fireEvent.blur(phone, {
      relatedTarget: screen.getByRole('button', { name: ui.formSubmit }),
    })
    expect(screen.queryByText(ui.contactErrorPhoneInvalid)).toBeNull()
    fireEvent.blur(phone, { relatedTarget: screen.getByLabelText(/company/i) })
    expect(screen.getByText(ui.contactErrorPhoneInvalid)).toBeInTheDocument()
  })
  it('skips blur validation while Send is pressed even with no related target', () => {
    const message = screen.getByLabelText(/message/i)
    const send = screen.getByRole('button', { name: ui.formSubmit })
    fireEvent.input(message, { target: { value: 'Too short' } })
    fireEvent.pointerDown(send)
    fireEvent.blur(message, { relatedTarget: null })
    expect(screen.queryByText(ui.contactErrorMessage)).toBeNull()
    fireEvent.pointerUp(window)
    fireEvent.click(send)
    expect(screen.getByText(ui.contactErrorName)).toBeInTheDocument()
    expect(screen.getByText(ui.contactErrorEmail)).toBeInTheDocument()
    expect(screen.getByText(ui.contactErrorPhone)).toBeInTheDocument()
    expect(screen.getByText(ui.contactErrorMessage)).toBeInTheDocument()
    expect(signedPostJson).not.toHaveBeenCalled()
  })

  it('skips blur validation when a touch press blurs after pointerup', () => {
    const message = screen.getByLabelText(/message/i)
    const send = screen.getByRole('button', { name: ui.formSubmit })
    fireEvent.input(message, { target: { value: 'Too short' } })
    fireEvent.pointerDown(send)
    fireEvent.pointerUp(send)
    fireEvent.blur(message, { relatedTarget: null })
    expect(screen.queryByText(ui.contactErrorMessage)).toBeNull()
    fireEvent.click(send)
    expect(screen.getByText(ui.contactErrorName)).toBeInTheDocument()
    expect(screen.getByText(ui.contactErrorEmail)).toBeInTheDocument()
    expect(screen.getByText(ui.contactErrorPhone)).toBeInTheDocument()
    expect(screen.getByText(ui.contactErrorMessage)).toBeInTheDocument()
    expect(signedPostJson).not.toHaveBeenCalled()
  })

  it('validates on blur again after the Send click', () => {
    const message = screen.getByLabelText(/message/i)
    fireEvent.input(message, { target: { value: 'Too short' } })
    fireEvent.pointerDown(screen.getByRole('button', { name: ui.formSubmit }))
    fireEvent.click(document.body)
    fireEvent.blur(message, { relatedTarget: null })
    expect(screen.getByText(ui.contactErrorMessage)).toBeInTheDocument()
  })

  it('validates on blur again once the Send press is released', () => {
    const message = screen.getByLabelText(/message/i)
    fireEvent.input(message, { target: { value: 'Too short' } })
    fireEvent.pointerDown(screen.getByRole('button', { name: ui.formSubmit }))
    fireEvent.pointerCancel(window)
    fireEvent.blur(message, { relatedTarget: null })
    expect(screen.getByText(ui.contactErrorMessage)).toBeInTheDocument()
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
