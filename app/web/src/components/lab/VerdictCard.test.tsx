import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { signOffCopy, verdictCopy } from '@/content/lab/copy'
import { feedbackCopy } from '@/content/lab/feedback'
import { EMPTY_ANSWERS, classifyStep, type StepAnswers } from '@/content/lab/rubric'
import { sendFeedback } from '@/lib/feedback'
import { FeedbackMarksProvider } from './feedbackMarks'
import { VerdictCard } from './VerdictCard'

vi.mock('@/lib/feedback', () => ({ sendFeedback: vi.fn() }))
const send = vi.mocked(sendFeedback)

const RULES_ANSWERS: StepAnswers = {
  ...EMPTY_ANSWERS,
  costly: 'no',
  checkable: 'no',
  fixedForm: 'yes',
  checklist: 'yes',
  changes: 'yes',
  pastCases: 'no',
}

const PLAIN_CODE_ANSWERS: StepAnswers = { ...RULES_ANSWERS, changes: 'no' }

const UNCLEAR_ANSWERS: StepAnswers = {
  ...EMPTY_ANSWERS,
  costly: 'not-sure',
  checkable: 'not-sure',
  fixedForm: 'not-sure',
  checklist: 'not-sure',
  changes: 'not-sure',
  pastCases: 'not-sure',
}

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

function card(answers: StepAnswers, stepId = 'step-1', position = 1, name = '') {
  return (
    <VerdictCard
      stepId={stepId}
      position={position}
      name={name}
      result={classifyStep(answers)}
      answers={answers}
      snippet={<pre />}
      revealOrder={0}
    />
  )
}

function renderCard(answers: StepAnswers) {
  return render(<FeedbackMarksProvider>{card(answers)}</FeedbackMarksProvider>)
}

const WRONG = { name: /^Wrong\?/ }

async function sendOnce(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', WRONG))
  await user.click(screen.getByRole('radio', { name: 'A simpler tool would do' }))
  await user.click(screen.getByRole('button', { name: feedbackCopy.send }))
}

describe('VerdictCard', () => {
  beforeEach(() => {
    mockMatchMedia(false)
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      },
    )
    send.mockReset()
    send.mockResolvedValue('sent')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('puts the verdict label in a heading with a hidden marker', () => {
    renderCard({
      ...EMPTY_ANSWERS,
      costly: 'no',
      fixedForm: 'yes',
      checklist: 'yes',
      changes: 'no',
    })
    const heading = screen.getByRole('heading', { level: 4 })
    expect(heading).toHaveTextContent(verdictCopy['plain-code'].label)
    expect(heading.querySelector('[aria-hidden="true"]')).toHaveClass('bg-text')
  })

  it('shows the sign-off modifier when the rule adds it', () => {
    renderCard({
      ...EMPTY_ANSWERS,
      costly: 'yes',
      checkable: 'yes',
      fixedForm: 'yes',
      checklist: 'yes',
      changes: 'no',
    })
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(signOffCopy)
  })

  it('raises the do-not-automate card and never makes it live', () => {
    const { container } = renderCard({
      ...EMPTY_ANSWERS,
      costly: 'yes',
      checkable: 'no',
      fixedForm: 'no',
    })
    const card = container.querySelector('.bg-elevated')
    expect(card).not.toBeNull()
    expect(card).toHaveClass('relative', 'overflow-hidden')
    expect(card!.querySelector(':scope > span[aria-hidden="true"]')).toHaveClass(
      'absolute',
      'inset-y-0',
      'left-0',
      'w-px',
      'bg-brand',
    )
    const marker = screen
      .getByRole('heading', { level: 4 })
      .querySelector('[aria-hidden="true"]')
    expect(marker).toHaveClass('h-3', 'w-px', 'bg-brand')
    expect(marker).not.toHaveClass('absolute')
    expect(container.querySelector('[aria-live],[role=status],[role=log]')).toBeNull()
  })

  it('renders no card rule for other verdicts', () => {
    const { container } = renderCard({ ...EMPTY_ANSWERS, costly: 'no', fixedForm: 'no' })
    expect(container.querySelector('.absolute')).toBeNull()
  })

  it('renders everything at once under reduced motion', () => {
    mockMatchMedia(true)
    const { container } = renderCard(EMPTY_ANSWERS)
    expect(screen.getByText(verdictCopy.unclear.label)).toBeInTheDocument()
    expect(container.querySelector('[data-reveal]')).toBeNull()
  })

  it('keeps the verdict block as the only subtree Reveal wraps', () => {
    const { container } = renderCard(EMPTY_ANSWERS)
    const reveal = container.querySelector('[data-reveal]')
    expect(reveal).not.toBeNull()
    expect(reveal!.querySelector('[data-verdict-block]')).not.toBeNull()
    expect(reveal!.querySelector('button')).toBeNull()
  })

  it('renders one Wrong? button named for the step on a resolved card', () => {
    render(
      <FeedbackMarksProvider>
        {card(RULES_ANSWERS, 'step-1', 2, 'Send invoices')}
      </FeedbackMarksProvider>,
    )
    expect(screen.getAllByRole('button', WRONG)).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: 'Wrong? Step 2, Send invoices' }),
    ).toBeInTheDocument()
  })

  it.each([
    'fixedForm',
    'checklist',
    'changes',
    'costly',
    'checkable',
    'pastCases',
  ] as const)('has no Wrong? button while %s is unanswered', (key) => {
    renderCard({ ...RULES_ANSWERS, [key]: null })
    expect(screen.queryByRole('button', WRONG)).toBeNull()
  })

  it('has no Wrong? button on a resolved unclear card', () => {
    expect(classifyStep(UNCLEAR_ANSWERS).verdict).toBe('unclear')
    renderCard(UNCLEAR_ANSWERS)
    expect(screen.queryByRole('button', WRONG)).toBeNull()
  })

  it('shows the thanks again when a sent verdict comes back after a different one', async () => {
    const user = userEvent.setup()
    const view = renderCard(RULES_ANSWERS)
    await sendOnce(user)
    expect(await screen.findByText(/^Thanks\./)).toBeInTheDocument()
    view.rerender(
      <FeedbackMarksProvider>{card(PLAIN_CODE_ANSWERS)}</FeedbackMarksProvider>,
    )
    expect(screen.getByRole('button', WRONG)).toBeInTheDocument()
    view.rerender(<FeedbackMarksProvider>{card(RULES_ANSWERS)}</FeedbackMarksProvider>)
    expect(await screen.findByText(/^Thanks\./)).toBeInTheDocument()
    expect(screen.queryByRole('button', WRONG)).toBeNull()
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('keeps the confirmation when the card remounts in the same provider', async () => {
    const user = userEvent.setup()
    const view = renderCard(RULES_ANSWERS)
    await sendOnce(user)
    expect(await screen.findByText(/^Thanks\./)).toBeInTheDocument()
    view.rerender(
      <FeedbackMarksProvider>
        <div />
      </FeedbackMarksProvider>,
    )
    expect(screen.queryByText(/^Thanks\./)).toBeNull()
    view.rerender(<FeedbackMarksProvider>{card(RULES_ANSWERS)}</FeedbackMarksProvider>)
    expect(await screen.findByText(/^Thanks\./)).toBeInTheDocument()
    expect(screen.queryByRole('button', WRONG)).toBeNull()
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('scopes the sent mark to the step id', async () => {
    const user = userEvent.setup()
    render(
      <FeedbackMarksProvider>
        {card(RULES_ANSWERS, 'step-1', 1, 'First')}
        {card(RULES_ANSWERS, 'step-2', 2, 'Second')}
      </FeedbackMarksProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Wrong? Step 1, First' }))
    await user.click(screen.getByRole('radio', { name: 'A simpler tool would do' }))
    await user.click(screen.getByRole('button', { name: feedbackCopy.send }))
    expect(await screen.findByText(/^Thanks\./)).toBeInTheDocument()
    expect(screen.getAllByRole('button', WRONG)).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: 'Wrong? Step 2, Second' }),
    ).toBeInTheDocument()
  })

  it('sends the verdict, rule and rubric version of the card', async () => {
    const user = userEvent.setup()
    renderCard(RULES_ANSWERS)
    await sendOnce(user)
    expect(send).toHaveBeenCalledWith({
      verdictId: 'rules',
      ruleId: 'R8',
      rubricVersion: classifyStep(RULES_ANSWERS).rubricVersion,
      reason: 'needs-less',
    })
  })
})
