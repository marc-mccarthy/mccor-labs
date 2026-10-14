import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ui } from '@/content/ui'
import { MESSAGE_MIN } from '@/lib/contact'
import { signedPostJson } from '@/lib/signedPost'

import { ContactForm } from './ContactForm'
import { contactCharge, contactSignal, messageFill } from './contactSignal'

vi.mock('@/lib/signedPost', () => ({ signedPostJson: vi.fn() }))

const EMPTY = { name: '', email: '', phone: '', message: '' }
const FULL = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '(202) 555-0123',
  message: 'A message long enough to pass validation.',
}

afterEach(() => {
  contactSignal.reset()
  delete window.__contactSignal
})

describe('contactCharge', () => {
  it('is zero for an empty form and one for a sendable form', () => {
    expect(contactCharge(EMPTY)).toBe(0)
    expect(contactCharge(FULL)).toBe(1)
  })

  it('gives a quarter each to a trimmed name, a valid-looking email and a valid phone', () => {
    expect(contactCharge({ ...EMPTY, name: '   ' })).toBe(0)
    expect(contactCharge({ ...EMPTY, name: ' Ada ' })).toBeCloseTo(1 / 4, 10)
    expect(contactCharge({ ...EMPTY, email: 'ada@example' })).toBe(0)
    expect(contactCharge({ ...EMPTY, email: 'ada@example.com' })).toBeCloseTo(1 / 4, 10)
    expect(contactCharge({ ...EMPTY, phone: '(202) 555-012' })).toBe(0)
    expect(contactCharge({ ...EMPTY, phone: '(102) 555-0123' })).toBe(0)
    expect(contactCharge({ ...EMPTY, phone: '(202) 555-0123' })).toBeCloseTo(1 / 4, 10)
  })

  it('fills the message quarter in proportion to MESSAGE_MIN', () => {
    const half = 'x'.repeat(MESSAGE_MIN / 2)
    expect(contactCharge({ ...EMPTY, message: `  ${half}  ` })).toBeCloseTo(1 / 8, 10)
    expect(contactCharge({ ...EMPTY, message: 'x'.repeat(MESSAGE_MIN * 3) })).toBeCloseTo(
      1 / 4,
      10,
    )
  })

  it('gives no credit to a name over the limit', () => {
    expect(contactCharge({ ...FULL, name: 'x'.repeat(101) })).toBeCloseTo(3 / 4, 10)
    expect(contactCharge({ ...FULL, name: 'x'.repeat(100) })).toBe(1)
  })

  it('gives no credit to a message over the limit', () => {
    expect(contactCharge({ ...FULL, message: 'x'.repeat(5001) })).toBeCloseTo(3 / 4, 10)
    expect(contactCharge({ ...FULL, message: 'x'.repeat(5000) })).toBe(1)
  })
})

describe('messageFill', () => {
  it('is proportional below the minimum, full in range, zero beyond the max', () => {
    expect(messageFill('')).toBe(0)
    expect(messageFill('x'.repeat(MESSAGE_MIN / 2))).toBe(0.5)
    expect(messageFill('x'.repeat(MESSAGE_MIN))).toBe(1)
    expect(messageFill('x'.repeat(5001))).toBe(0)
  })
})

describe('contactSignal', () => {
  it('starts idle and uncharged', () => {
    expect(contactSignal.getSnapshot()).toEqual({ charge: 0, phase: 'idle' })
  })

  it('notifies subscribers on change and keeps the snapshot stable otherwise', () => {
    const listener = vi.fn()
    const stop = contactSignal.subscribe(listener)
    const before = contactSignal.getSnapshot()
    contactSignal.setPhase('idle')
    expect(listener).not.toHaveBeenCalled()
    expect(contactSignal.getSnapshot()).toBe(before)
    contactSignal.setCharge(0.5)
    contactSignal.setPhase('sending')
    expect(listener).toHaveBeenCalledTimes(2)
    expect(contactSignal.getSnapshot()).toEqual({ charge: 0.5, phase: 'sending' })
    stop()
    contactSignal.setPhase('sent')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('clamps charge to the unit range', () => {
    contactSignal.setCharge(2)
    expect(contactSignal.getSnapshot().charge).toBe(1)
    contactSignal.setCharge(-1)
    expect(contactSignal.getSnapshot().charge).toBe(0)
  })

  it('resets to idle and uncharged', () => {
    contactSignal.setCharge(1)
    contactSignal.setPhase('sent')
    contactSignal.reset()
    expect(contactSignal.getSnapshot()).toEqual({ charge: 0, phase: 'idle' })
  })

  it('exposes nothing on window without the spec flag', () => {
    contactSignal.setPhase('sent')
    expect('__contactSignal' in window).toBe(false)
  })

  it('mirrors the snapshot onto window when the spec flag exists', () => {
    const mirror = {}
    window.__contactSignal = mirror
    contactSignal.setCharge(1)
    contactSignal.setPhase('sent')
    expect(window.__contactSignal).toBe(mirror)
    expect(mirror).toEqual({ charge: 1, phase: 'sent' })
  })
})

describe('ContactForm drives the signal', () => {
  beforeEach(() => {
    vi.mocked(signedPostJson).mockReset()
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  async function fill() {
    await userEvent.type(screen.getByLabelText(/name/i), FULL.name)
    expect(contactSignal.getSnapshot().charge).toBeCloseTo(1 / 4, 10)
    await userEvent.type(screen.getByLabelText(/email/i), FULL.email)
    expect(contactSignal.getSnapshot().charge).toBeCloseTo(2 / 4, 10)
    await userEvent.type(screen.getByLabelText(/phone/i), '2025550123')
    expect(contactSignal.getSnapshot().charge).toBeCloseTo(3 / 4, 10)
    await userEvent.type(screen.getByLabelText(/message/i), FULL.message)
    expect(contactSignal.getSnapshot().charge).toBe(1)
  }

  it('charges from input, reaches sent, and resets on unmount', async () => {
    vi.mocked(signedPostJson).mockResolvedValue(
      new Response(JSON.stringify({ reference: 'MC-7Q4K' }), { status: 200 }),
    )
    const view = render(createElement(ContactForm, { endpoint: '/api/contact' }))
    await fill()
    await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
    await vi.waitFor(() => {
      expect(contactSignal.getSnapshot().phase).toBe('sent')
    })
    view.unmount()
    expect(contactSignal.getSnapshot()).toEqual({ charge: 0, phase: 'idle' })
  })

  it('writes sending then error when the endpoint fails', async () => {
    let answer: (response: Response) => void = () => undefined
    vi.mocked(signedPostJson).mockReturnValue(
      new Promise<Response>((resolve) => {
        answer = resolve
      }),
    )
    render(createElement(ContactForm, { endpoint: '/api/contact' }))
    await fill()
    await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
    await vi.waitFor(() => {
      expect(contactSignal.getSnapshot().phase).toBe('sending')
    })
    answer(new Response('{}', { status: 500 }))
    await vi.waitFor(() => {
      expect(contactSignal.getSnapshot().phase).toBe('error')
    })
  })

  it('ignores a send that settles after unmount', async () => {
    let answer: (response: Response) => void = () => undefined
    vi.mocked(signedPostJson).mockReturnValue(
      new Promise<Response>((resolve) => {
        answer = resolve
      }),
    )
    const view = render(createElement(ContactForm, { endpoint: '/api/contact' }))
    await fill()
    await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
    await vi.waitFor(() => {
      expect(contactSignal.getSnapshot().phase).toBe('sending')
    })
    view.unmount()
    answer(new Response(JSON.stringify({ reference: 'MC-7Q4K' }), { status: 200 }))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(contactSignal.getSnapshot()).toEqual({ charge: 0, phase: 'idle' })
  })

  it('writes idle when validation stops the submit', async () => {
    render(createElement(ContactForm, { endpoint: '/api/contact' }))
    contactSignal.setPhase('error')
    await userEvent.click(screen.getByRole('button', { name: ui.formSubmit }))
    expect(contactSignal.getSnapshot().phase).toBe('idle')
    expect(signedPostJson).not.toHaveBeenCalled()
  })
})
