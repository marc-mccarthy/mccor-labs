import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signOffCopy, verdictCopy } from '@/content/lab/copy'
import { EMPTY_ANSWERS, classifyStep, type StepAnswers } from '@/content/lab/rubric'
import { VerdictCard } from './VerdictCard'

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

function renderCard(answers: StepAnswers) {
  return render(
    <VerdictCard
      position={1}
      name=""
      result={classifyStep(answers)}
      answers={answers}
      snippet={<pre />}
      revealOrder={0}
    />,
  )
}

describe('VerdictCard', () => {
  beforeEach(() => {
    mockMatchMedia(false)
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
})
