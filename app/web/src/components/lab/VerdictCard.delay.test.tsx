import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_ANSWERS, classifyStep } from '@/content/lab/rubric'
import { FeedbackMarksProvider } from './feedbackMarks'
import { VerdictCard } from './VerdictCard'

const { readDurationSeconds } = vi.hoisted(() => ({
  readDurationSeconds: vi.fn((name: string) =>
    name === '--stagger-interval' ? 0.08 : 0,
  ),
}))

vi.mock('@/components/motion/Reveal', () => ({
  Reveal: ({ children, delay }: { children: ReactNode; delay?: number }) => (
    <div data-delay={String(delay)}>{children}</div>
  ),
}))

vi.mock('@/components/motion/tokens', () => ({ readDurationSeconds }))

function delayFor(revealOrder: number) {
  const { container, unmount } = render(
    <FeedbackMarksProvider>
      <VerdictCard
        stepId="step-1"
        position={1}
        name=""
        result={classifyStep(EMPTY_ANSWERS)}
        answers={EMPTY_ANSWERS}
        snippet={<pre />}
        revealOrder={revealOrder}
      />
    </FeedbackMarksProvider>,
  )
  const delay = Number(
    container.querySelector('[data-delay]')?.getAttribute('data-delay'),
  )
  unmount()
  return delay
}

describe('VerdictCard reveal delay', () => {
  it('staggers by the --stagger-interval token, caps at three intervals and reads the token once', () => {
    expect(delayFor(0)).toBe(0)
    expect(delayFor(1)).toBeCloseTo(0.08)
    expect(delayFor(3)).toBeCloseTo(0.24)
    expect(delayFor(7)).toBeCloseTo(0.24)
    expect(
      readDurationSeconds.mock.calls.filter(([name]) => name === '--stagger-interval'),
    ).toHaveLength(1)
  })
})
