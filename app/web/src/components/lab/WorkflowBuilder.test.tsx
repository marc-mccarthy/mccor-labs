import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  answerCopy,
  builderCopy,
  fillTemplate,
  questionCopy,
  verdictCopy,
} from '@/content/lab/copy'
import { MAX_STEPS } from '@/content/lab/limits'
import { RULE_IDS, type RuleId } from '@/content/lab/rubric'
import { WorkflowBuilder } from './WorkflowBuilder'

const snippets = Object.fromEntries(
  RULE_IDS.map((id) => [id, <pre key={id}>{id}</pre>]),
) as Record<RuleId, ReactNode>

function status() {
  return document.querySelector('[data-lab-status]')
}

function nameField(n: number) {
  return screen.getByLabelText(fillTemplate(builderCopy.stepNameLabel, { n }))
}

async function answer(n: number, key: keyof typeof questionCopy, value: 'yes' | 'no') {
  const step = screen.getByTestId(`step-${String(n)}`)
  const group = within(step).getByRole('group', { name: questionCopy[key].text })
  await userEvent.click(within(group).getByRole('radio', { name: answerCopy[value] }))
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('WorkflowBuilder', () => {
  it('starts with one unanswered step that is worth a conversation', () => {
    render(<WorkflowBuilder snippets={snippets} />)
    expect(screen.getAllByTestId(/^step-\d+$/)).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(
      verdictCopy.unclear.label,
    )
  })

  it('focuses the new name field and announces an added step', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    expect(nameField(2)).toHaveFocus()
    expect(status()).toHaveTextContent('Step 2 added.')
  })

  it('never announces name keystrokes', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.type(nameField(1), 'Send invoices')
    expect(status()?.textContent).toBe('')
  })

  it('announces a verdict change with the step name', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.type(nameField(1), 'Pay suppliers')
    await answer(1, 'costly', 'yes')
    await answer(1, 'checkable', 'no')
    await answer(1, 'fixedForm', 'no')
    expect(status()).toHaveTextContent('Step 1, Pay suppliers: keep a person on it')
  })

  it('stops at eight steps with an aria-disabled Add that says why', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    for (let i = 1; i < MAX_STEPS; i += 1) {
      await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    }
    const add = screen.getByRole('button', { name: builderCopy.add })
    expect(add).toHaveAttribute('aria-disabled', 'true')
    expect(add).toHaveAccessibleDescription(builderCopy.addLimit)
    await userEvent.click(add)
    expect(screen.getAllByTestId(/^step-\d+$/)).toHaveLength(MAX_STEPS)
  })

  it('keeps one step open at a time', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    const body = (n: number) => document.getElementById(`step-${String(n)}-body`)
    const toggle = (n: number) =>
      within(screen.getByTestId(`step-${String(n)}`)).getByRole('button', {
        name: /answered/,
      })
    expect(body(2)).toHaveClass('block')
    expect(body(1)).toHaveClass('hidden')
    await userEvent.click(toggle(1))
    expect(body(1)).toHaveClass('block')
    expect(body(2)).toHaveClass('hidden')
    await userEvent.click(toggle(1))
    expect(body(1)).toHaveClass('hidden')
    expect(body(2)).toHaveClass('hidden')
  })

  it('under full motion remounts only the changed step verdict block', async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      },
    )
    render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    await waitFor(() => {
      expect(document.querySelector('[data-reveal="pending"]')).toBeNull()
    })
    const block = (n: number) =>
      screen.getByTestId(`step-${String(n)}`).querySelector('[data-verdict-block]')
    await answer(1, 'costly', 'no')
    const firstBefore = block(1)
    const secondBefore = block(2)
    await answer(1, 'fixedForm', 'no')
    expect(block(1)).not.toBe(firstBefore)
    expect(block(1)).toHaveClass('motion-safe:starting:opacity-0')
    expect(block(1)).toHaveTextContent(verdictCopy['language-model'].label)
    expect(block(2)).toBe(secondBefore)
  })
})
