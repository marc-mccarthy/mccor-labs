import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { SENT_TOAST_MS, SentToast } from './SentToast'
import { ui } from '@/content/ui'

describe('SentToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the sent text and is hidden from assistive tech', () => {
    render(<SentToast />)
    const text = screen.getByText(ui.contactToastSent)
    expect(text.closest('[data-sent-toast]')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('has no focusable controls', () => {
    render(<SentToast />)
    const toast = document.querySelector('[data-sent-toast]')
    expect(toast?.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0)
  })

  it('disappears after its timeout', () => {
    render(<SentToast />)
    act(() => {
      vi.advanceTimersByTime(SENT_TOAST_MS - 1)
    })
    expect(document.querySelector('[data-sent-toast]')).not.toBeNull()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(document.querySelector('[data-sent-toast]')).toBeNull()
  })
})
