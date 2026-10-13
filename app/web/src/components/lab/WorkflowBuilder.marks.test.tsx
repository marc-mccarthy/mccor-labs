import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { builderCopy, fillTemplate } from '@/content/lab/copy'
import { RULE_IDS, type RubricResult, type RuleId } from '@/content/lab/rubric'
import { markKey, useFeedbackMarks } from './feedbackMarks'
import { WorkflowBuilder } from './WorkflowBuilder'

vi.mock('./VerdictCard', () => ({
  VerdictCard: ({ name, result }: { name: string; result: RubricResult }) => {
    const { alreadySent, recordSent } = useFeedbackMarks()
    const key = markKey(name, result.verdict, result.ruleId)
    return (
      <button
        type="button"
        data-sent={String(alreadySent(key))}
        onClick={() => {
          recordSent(key)
        }}
      >
        Mark
      </button>
    )
  },
}))

const snippets = Object.fromEntries(
  RULE_IDS.map((id) => [id, <pre key={id}>{id}</pre>]),
) as Record<RuleId, ReactNode>

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

describe('WorkflowBuilder feedback marks', () => {
  it('keeps a mark when the verdict card remounts after remove and undo', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    const nameField = (n: number) =>
      screen.getByLabelText(fillTemplate(builderCopy.stepNameLabel, { n }))
    await userEvent.type(nameField(1), 'One')
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    await userEvent.type(nameField(2), 'Two')
    const mark = (n: number) =>
      within(screen.getByTestId(`step-${String(n)}`)).getByRole('button', {
        name: 'Mark',
      })
    await userEvent.click(mark(1))
    const before = mark(1)
    expect(before).toHaveAttribute('data-sent', 'true')
    expect(mark(2)).toHaveAttribute('data-sent', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'Remove Step 1, One' }))
    await userEvent.click(screen.getByRole('button', { name: builderCopy.undo }))
    expect(nameField(1)).toHaveValue('One')
    expect(mark(1)).not.toBe(before)
    expect(mark(1)).toHaveAttribute('data-sent', 'true')
    expect(mark(2)).toHaveAttribute('data-sent', 'false')
  })
})
