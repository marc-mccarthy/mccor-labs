import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { builderCopy } from '@/content/lab/copy'
import { RULE_IDS, type RuleId } from '@/content/lab/rubric'
import { WorkflowBuilder } from './WorkflowBuilder'

vi.mock('@/components/motion/Reveal', () => ({
  Reveal: ({ children, delay }: { children: ReactNode; delay?: number }) => (
    <div data-delay={String(delay)}>{children}</div>
  ),
}))

vi.mock('@/components/motion/tokens', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/motion/tokens')>()),
  readDurationSeconds: (name: string) => (name === '--stagger-interval' ? 0.08 : 0),
}))

const snippets = Object.fromEntries(
  RULE_IDS.map((id) => [id, <pre key={id}>{id}</pre>]),
) as Record<RuleId, ReactNode>

function delays(): number[] {
  return screen
    .getAllByTestId(/^step-\d+$/)
    .map((step) => Number(step.querySelector('[data-delay]')?.getAttribute('data-delay')))
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

describe('WorkflowBuilder reveal order', () => {
  it('gives the first step order 0 and a step added later order 0', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    expect(delays()).toEqual([0])
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    expect(delays()).toEqual([0, 0])
  })

  it('staggers a preset load by step index, capped at 3', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.click(screen.getByRole('button', { name: 'Load Invoice Intake' }))
    const loaded = delays()
    expect(loaded).toHaveLength(4)
    loaded.forEach((delay, index) => {
      expect(delay).toBeCloseTo(Math.min(index, 3) * 0.08)
    })
  })
})
