import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { verdictCopy } from '@/content/lab/copy'
import { EMPTY_ANSWERS, classifyStep, type StepAnswers } from '@/content/lab/rubric'
import { ProgressRail, isResolved, summarize } from './ProgressRail'

const full: StepAnswers = {
  ...EMPTY_ANSWERS,
  fixedForm: 'yes',
  checklist: 'yes',
  changes: 'no',
  costly: 'no',
  checkable: 'not-sure',
  pastCases: 'no',
}
const steps = [full, EMPTY_ANSWERS].map((answers) => ({
  answers,
  result: classifyStep(answers),
}))

describe('ProgressRail', () => {
  it('counts a step as resolved once every visible question has any answer', () => {
    expect(
      summarize([{ answers: { ...full, changes: null }, result: classifyStep(full) }])
        .resolved,
    ).toBe(0)
    const summary = summarize(steps)
    expect(summary.resolved).toBe(1)
    expect(summary.total).toBe(2)
    expect(summary.tally['plain-code']).toBe(1)
    expect(summary.tally.unclear).toBe(1)
  })

  it('ignores the follow-up unless question 2 is yes, and ignores frequency', () => {
    expect(isResolved({ ...full, checklist: 'no', changes: null })).toBe(true)
    expect(isResolved({ ...full, changes: null })).toBe(false)
    expect(isResolved({ ...full, checklist: 'not-sure', changes: null })).toBe(true)
    expect(isResolved({ ...full, frequency: null })).toBe(true)
    expect(isResolved(EMPTY_ANSWERS)).toBe(false)
  })

  it('scales a brand line by resolved over total and says it in text', () => {
    const { container } = render(<ProgressRail {...summarize(steps)} />)
    const fill = container.querySelector('[data-progress-fill]')!
    expect(fill).toHaveClass('h-px', 'bg-brand', 'origin-left')
    expect(fill).toHaveStyle({ transform: 'scaleX(0.5)' })
    expect(fill.parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('1 of 2 steps answered')).toBeInTheDocument()
  })

  it('draws an empty line when there are no steps', () => {
    const { container } = render(<ProgressRail {...summarize([])} />)
    expect(container.querySelector('[data-progress-fill]')).toHaveStyle({
      transform: 'scaleX(0)',
    })
  })

  it('lists only the verdicts present', () => {
    render(<ProgressRail {...summarize(steps)} />)
    expect(screen.getByText(verdictCopy['plain-code'].label)).toBeInTheDocument()
    expect(screen.queryByText(verdictCopy['classic-ml'].label)).not.toBeInTheDocument()
  })

  it('draws the do-not-automate marker inline, never as a positioned rule', () => {
    const answers: StepAnswers = {
      ...EMPTY_ANSWERS,
      costly: 'yes',
      checkable: 'no',
      fixedForm: 'no',
    }
    render(<ProgressRail {...summarize([{ answers, result: classifyStep(answers) }])} />)
    const marker = screen
      .getByText(verdictCopy['do-not-automate'].label)
      .closest('li')
      ?.querySelector('[aria-hidden="true"]')
    expect(marker).toHaveClass('h-3', 'w-px', 'bg-brand')
    expect(marker).not.toHaveClass('absolute')
  })
})
