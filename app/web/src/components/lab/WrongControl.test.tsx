import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { feedbackCopy } from '@/content/lab/feedback'
import type { Verdict } from '@/content/lab/rubric'
import { sendFeedback } from '@/lib/feedback'
import { WrongControl, type WrongControlProps } from './WrongControl'

vi.mock('@/lib/feedback', () => ({ sendFeedback: vi.fn() }))
const send = vi.mocked(sendFeedback)
const legend = feedbackCopy.legend
const LIVE = '[aria-live], [role="status"], [role="log"]'

function renderControl({
  verdict = 'rules',
  alreadySent = false,
}: { verdict?: WrongControlProps['verdict']; alreadySent?: boolean } = {}) {
  const onSent = vi.fn()
  const view = render(
    <WrongControl
      verdict={verdict}
      ruleId="R8"
      rubricVersion="2.0.0"
      stepLabel="Step 2, Send invoices"
      alreadySent={alreadySent}
      onSent={onSent}
    />,
  )
  return { user: userEvent.setup(), onSent, container: view.container }
}

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^Wrong\?/ }))
}

beforeEach(() => {
  send.mockReset()
})

describe('WrongControl', () => {
  it('starts collapsed with the step in its name', () => {
    renderControl()
    const toggle = screen.getByRole('button', { name: 'Wrong? Step 2, Send invoices' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('group', { name: legend })).toBeNull()
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
  })

  it('shows three native radios in a fieldset when opened', async () => {
    const { user } = renderControl()
    await open(user)
    expect(screen.getByRole('button', { name: /^Wrong\?/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByRole('group', { name: legend })).toBeInTheDocument()
    expect(screen.queryAllByRole('radio')).toHaveLength(3)
  })

  it('gives every target 44 px and reuses the StepCard radio classes', async () => {
    const { user } = renderControl()
    await open(user)
    for (const button of [
      screen.getByRole('button', { name: /^Wrong\?/ }),
      screen.getByRole('button', { name: feedbackCopy.send }),
    ])
      expect(button).toHaveClass('h-11', 'min-w-11')
    for (const radio of screen.queryAllByRole('radio'))
      expect(radio.closest('label')).toHaveClass(
        'min-h-11',
        'min-w-11',
        'border-border-strong',
        'has-checked:bg-elevated',
        'has-checked:font-semibold',
      )
  })

  it('uses the surface fill on an elevated do-not-automate card', async () => {
    const { user } = renderControl({ verdict: 'do-not-automate' })
    await open(user)
    for (const radio of screen.queryAllByRole('radio')) {
      const label = radio.closest('label')
      expect(label).toHaveClass('has-checked:bg-surface', 'has-checked:font-semibold')
      expect(label).not.toHaveClass('has-checked:bg-elevated')
    }
  })

  it('does not send without a reason and describes why', async () => {
    const { user } = renderControl()
    await open(user)
    const sendButton = screen.getByRole('button', { name: feedbackCopy.send })
    expect(sendButton).toHaveAttribute('aria-disabled', 'true')
    await user.click(sendButton)
    expect(send).not.toHaveBeenCalled()
    expect(sendButton).toHaveAccessibleDescription(feedbackCopy.pickFirst)
  })

  it('sends one body on a double click, then focuses the confirmation', async () => {
    let release: () => void = vi.fn()
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    send.mockImplementation(async () => {
      await gate
      return 'sent'
    })
    const { user, onSent, container } = renderControl()
    await open(user)
    await user.click(screen.getByRole('radio', { name: 'A simpler tool would do' }))
    await user.dblClick(screen.getByRole('button', { name: feedbackCopy.send }))
    expect(screen.getByRole('button', { name: feedbackCopy.sending })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    release()
    const confirmation = await screen.findByText(/^Thanks\./)
    expect(confirmation).toHaveFocus()
    expect(confirmation).toHaveAttribute('tabindex', '-1')
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith({
      verdictId: 'rules',
      ruleId: 'R8',
      rubricVersion: '2.0.0',
      reason: 'needs-less',
    })
    expect(onSent).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /^Wrong\?/ })).toBeNull()
    expect(container.querySelector('[role="status"], [aria-live]')).toBeNull()
  })

  it('shows the daily cap as final without recording a sent mark', async () => {
    send.mockResolvedValue('daily_cap')
    const { user, onSent } = renderControl()
    await open(user)
    await user.click(screen.getByRole('radio', { name: 'This needs more than that' }))
    await user.click(screen.getByRole('button', { name: feedbackCopy.send }))
    expect(await screen.findByText(feedbackCopy.dailyCap)).toHaveFocus()
    expect(onSent).not.toHaveBeenCalled()
  })

  it('lets the visitor retry after an error', async () => {
    send.mockResolvedValueOnce('error').mockResolvedValueOnce('sent')
    const { user } = renderControl()
    await open(user)
    await user.click(
      screen.getByRole('radio', { name: 'The questions missed something' }),
    )
    await user.click(screen.getByRole('button', { name: feedbackCopy.send }))
    expect(await screen.findByRole('alert')).toHaveTextContent(feedbackCopy.error)
    expect(screen.getByRole('button', { name: feedbackCopy.send })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: feedbackCopy.send }))
    expect(await screen.findByText(/^Thanks\./)).toHaveFocus()
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('shows the confirmation and no way to resend when already sent', () => {
    renderControl({ alreadySent: true })
    expect(screen.getByText(/^Thanks\./)).not.toHaveFocus()
    expect(screen.queryByRole('button', { name: /^Wrong\?/ })).toBeNull()
    expect(screen.queryByRole('button', { name: feedbackCopy.send })).toBeNull()
    expect(send).not.toHaveBeenCalled()
  })

  it('never accepts the unclear verdict', () => {
    expectTypeOf<WrongControlProps['verdict']>().toEqualTypeOf<
      Exclude<Verdict, 'unclear'>
    >()
  })

  it('lets only the in-flight guard stop a second send in the same act', async () => {
    send.mockReturnValue(new Promise(() => undefined))
    const { user } = renderControl()
    await open(user)
    await user.click(screen.getByRole('radio', { name: 'A simpler tool would do' }))
    const sendButton = screen.getByRole('button', { name: feedbackCopy.send })
    act(() => {
      sendButton.click()
      sendButton.click()
    })
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('has no live region while open or in the error state', async () => {
    send.mockResolvedValue('error')
    const { user, container } = renderControl()
    expect(container.querySelector(LIVE)).toBeNull()
    await open(user)
    expect(container.querySelector(LIVE)).toBeNull()
    await user.click(screen.getByRole('radio', { name: 'A simpler tool would do' }))
    await user.click(screen.getByRole('button', { name: feedbackCopy.send }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(container.querySelector(LIVE)).toBeNull()
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1)
  })

  it('points aria-controls at a panel that holds the radio group', async () => {
    const { user, container } = renderControl()
    const toggle = screen.getByRole('button', { name: /^Wrong\?/ })
    const panelId = toggle.getAttribute('aria-controls') ?? ''
    expect(container.querySelector(`[id="${panelId}"]`)).not.toBeNull()
    await open(user)
    const panel = container.querySelector(`[id="${panelId}"]`)
    expect(panel).toContainElement(screen.getByRole('group', { name: legend }))
  })

  it('describes Send with the hint while no reason is picked, visible only after an attempt', async () => {
    const { user } = renderControl()
    await open(user)
    const sendButton = screen.getByRole('button', { name: feedbackCopy.send })
    expect(sendButton).toHaveAccessibleDescription(feedbackCopy.pickFirst)
    expect(screen.getByText(feedbackCopy.pickFirst)).toHaveClass('sr-only')
    await user.click(sendButton)
    expect(screen.getByText(feedbackCopy.pickFirst)).not.toHaveClass('sr-only')
    await user.click(screen.getByRole('radio', { name: 'A simpler tool would do' }))
    expect(sendButton).not.toHaveAccessibleDescription()
    expect(screen.queryByText(feedbackCopy.pickFirst)).toBeNull()
  })

  it('keeps the error visible when the panel is collapsed', async () => {
    send.mockResolvedValue('error')
    const { user } = renderControl()
    await open(user)
    await user.click(screen.getByRole('radio', { name: 'A simpler tool would do' }))
    await user.click(screen.getByRole('button', { name: feedbackCopy.send }))
    await screen.findByRole('alert')
    await open(user)
    expect(screen.getByRole('button', { name: /^Wrong\?/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByRole('alert')).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent(feedbackCopy.error)
  })
})
