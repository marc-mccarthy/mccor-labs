import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FeedbackMarksProvider, markKey, useFeedbackMarks } from './feedbackMarks'

const KEY = markKey('step-1', 'language-model', 'R5')

function Probe() {
  const { alreadySent, recordSent } = useFeedbackMarks()
  return (
    <button
      type="button"
      data-sent={String(alreadySent(KEY))}
      onClick={() => {
        recordSent(KEY)
      }}
    >
      Mark
    </button>
  )
}

function Harness({ probeKey }: { probeKey: string }) {
  return (
    <FeedbackMarksProvider>
      <Probe key={probeKey} />
    </FeedbackMarksProvider>
  )
}

describe('feedbackMarks', () => {
  it('builds the key from step id, verdict and rule id', () => {
    expect(KEY).toBe('step-1:language-model:R5')
  })

  it('records a mark and keeps it when the consumer remounts', async () => {
    const { rerender } = render(<Harness probeKey="a" />)
    expect(screen.getByRole('button', { name: 'Mark' })).toHaveAttribute(
      'data-sent',
      'false',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Mark' }))
    const before = screen.getByRole('button', { name: 'Mark' })
    expect(before).toHaveAttribute('data-sent', 'true')
    rerender(<Harness probeKey="b" />)
    const after = screen.getByRole('button', { name: 'Mark' })
    expect(after).not.toBe(before)
    expect(after).toHaveAttribute('data-sent', 'true')
  })

  it('throws outside a provider', () => {
    expect(() => render(<Probe />)).toThrow(/FeedbackMarksProvider/)
  })
})
