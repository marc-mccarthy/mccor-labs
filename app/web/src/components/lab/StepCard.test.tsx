import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { answerCopy, builderCopy, fillTemplate, questionCopy } from '@/content/lab/copy'
import { NAME_MAX } from '@/content/lab/limits'
import { EMPTY_ANSWERS, visibleQuestions } from '@/content/lab/rubric'
import { StepCard, type StepCardProps } from './StepCard'

function setup(overrides: Partial<StepCardProps> = {}) {
  const props: StepCardProps = {
    step: { id: 'step-2', name: 'Send invoices', answers: EMPTY_ANSWERS },
    position: 2,
    total: 3,
    onRename: vi.fn(),
    onAnswer: vi.fn(),
    onFrequency: vi.fn(),
    onMove: vi.fn(),
    onRemove: vi.fn(),
    controlRef: vi.fn(),
    open: true,
    verdictLabel: 'Worth a conversation',
    onToggle: vi.fn(),
    ...overrides,
  }
  render(
    <ol>
      <StepCard {...props} />
    </ol>,
  )
  return props
}

describe('StepCard', () => {
  it('labels the name field and caps its length', () => {
    setup()
    const input = screen.getByLabelText(fillTemplate(builderCopy.stepNameLabel, { n: 2 }))
    expect(input).toHaveAttribute('maxlength', String(NAME_MAX))
    expect(input).toHaveClass('border-border-strong')
  })

  it('asks each visible question in a fieldset whose legend is the question', () => {
    setup()
    for (const key of visibleQuestions(EMPTY_ANSWERS)) {
      const group = screen.getByRole('group', { name: questionCopy[key].text })
      expect(within(group).getAllByRole('radio')).toHaveLength(3)
    }
    expect(
      screen.queryByRole('group', { name: questionCopy.changes.text }),
    ).not.toBeInTheDocument()
  })

  it('asks the checklist follow-up only when question 2 is yes', () => {
    setup({
      step: {
        id: 'step-2',
        name: 'Send invoices',
        answers: { ...EMPTY_ANSWERS, checklist: 'yes' },
      },
    })
    expect(
      screen.getByRole('group', { name: questionCopy.changes.text }),
    ).toBeInTheDocument()
  })

  it('makes every step button at least 44 by 44 px', () => {
    setup()
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveClass('min-w-11')
      expect(button.className).toMatch(/(^|\s)(min-)?h-11(\s|$)/)
    }
  })

  it('starts every question unanswered', () => {
    setup()
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked()
  })

  it('reports an answer with its question key', async () => {
    const props = setup()
    const group = screen.getByRole('group', { name: questionCopy.costly.text })
    await userEvent.click(within(group).getByRole('radio', { name: answerCopy.yes }))
    expect(props.onAnswer).toHaveBeenCalledWith('costly', 'yes')
  })

  it('gives every option a 44 px target and a non-color chosen state', () => {
    setup()
    const label = screen.getAllByRole('radio')[0]!.closest('label')!
    expect(label).toHaveClass(
      'min-h-11',
      'min-w-11',
      'has-checked:bg-elevated',
      'has-checked:font-semibold',
    )
  })

  it('names the move and remove buttons with the step number and name', async () => {
    const props = setup()
    await userEvent.click(
      screen.getByRole('button', { name: 'Move Step 2, Send invoices up' }),
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Step 2, Send invoices' }),
    )
    expect(props.onMove).toHaveBeenCalledWith('up')
    expect(props.onRemove).toHaveBeenCalled()
  })

  it('keeps edge moves focusable but inert', async () => {
    const props = setup({ position: 1, total: 1 })
    const up = screen.getByRole('button', { name: /Move Step 1, Send invoices up/ })
    expect(up).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(up)
    expect(props.onMove).not.toHaveBeenCalled()
  })

  it('hides Remove when only one step is left', () => {
    setup({ position: 1, total: 1 })
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
  })
})

describe('StepCard accordion', () => {
  it('summarises a collapsed step with its name, verdict and answered count', () => {
    setup({
      open: false,
      verdictLabel: 'A simple program',
      step: {
        id: 'step-2',
        name: 'Send invoices',
        answers: { ...EMPTY_ANSWERS, costly: 'no', fixedForm: 'yes' },
      },
    })
    const toggle = screen.getByRole('button', {
      name: /Step 2, Send invoices\. A simple program\. 2 of 5 answered/,
    })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', 'step-2-body')
    expect(document.getElementById('step-2-body')).toHaveClass('hidden', 'md:block')
  })

  it('shows the body when open and reports a toggle', async () => {
    const props = setup({ open: true })
    expect(document.getElementById('step-2-body')).toHaveClass('block', 'md:block')
    await userEvent.click(screen.getByRole('button', { name: /answered/ }))
    expect(props.onToggle).toHaveBeenCalled()
  })
})
