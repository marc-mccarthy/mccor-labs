import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_ANSWERS, classifyStep } from '@/content/lab/rubric'
import { FeedbackMarksProvider } from './feedbackMarks'
import { VerdictCard } from './VerdictCard'

const gate = vi.hoisted(() => ({
  release: () => undefined,
  promise: undefined as Promise<unknown> | undefined,
}))

vi.mock('@/components/motion/features', async () => {
  const motion = await import('motion/react')
  gate.promise = new Promise((resolve) => {
    gate.release = () => {
      resolve(motion.domAnimation)
    }
  })
  return { loadDomAnimationFeatures: () => gate.promise }
})

const answers = {
  ...EMPTY_ANSWERS,
  costly: 'yes',
  checkable: 'no',
  fixedForm: 'no',
} as const

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top: window.innerHeight + 100,
    bottom: window.innerHeight + 200,
  } as DOMRect)
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('VerdictCard while Reveal swaps in its motion wrapper', () => {
  it('keeps an open Why panel open and focused', async () => {
    const { container } = render(
      <FeedbackMarksProvider>
        <VerdictCard
          stepId="step-1"
          position={1}
          name="Pay suppliers"
          result={classifyStep(answers)}
          answers={answers}
          snippet={<pre>R2 source</pre>}
          revealOrder={0}
        />
      </FeedbackMarksProvider>,
    )
    expect(container.querySelector('[data-reveal="pending"]')).not.toBeNull()
    const button = screen.getByRole('button', { name: /^Why\?/ })
    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveFocus()

    await act(async () => {
      gate.release()
      await gate.promise
    })
    await waitFor(() => {
      expect(container.querySelector('[data-reveal=""]')).not.toBeNull()
    })

    const after = screen.getByRole('button', { name: /^Why\?/ })
    expect(after).toBe(button)
    expect(after).toHaveAttribute('aria-expanded', 'true')
    expect(after).toHaveFocus()
  })
})
