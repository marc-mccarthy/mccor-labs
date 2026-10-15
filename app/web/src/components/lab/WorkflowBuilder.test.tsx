import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  answerCopy,
  builderCopy,
  fillTemplate,
  labLive,
  presets,
  questionCopy,
  statusCopy,
  summaryCopy,
  verdictCopy,
} from '@/content/lab/copy'
import { MAX_STEPS } from '@/content/lab/limits'
import { RULE_IDS, classifyStep, type RuleId } from '@/content/lab/rubric'
import type { LaneState, RaceResult } from '@/lib/lab'
import { WorkflowBuilder } from './WorkflowBuilder'

const mocks = vi.hoisted(() => ({ env: { labLive: false }, postLab: vi.fn() }))

vi.mock('@/lib/env', () => ({ env: mocks.env }))

vi.mock('@/lib/lab', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/lab')>()),
  postLab: mocks.postLab,
}))

const snippets = Object.fromEntries(
  RULE_IDS.map((id) => [id, <pre key={id}>{id}</pre>]),
) as Record<RuleId, ReactNode>

const RACE: RaceResult = {
  kind: 'race',
  modelLabel: 'Nova 2 Lite',
  pricesAsOf: '2026-10-09',
  model: {
    answers: ['billing', 'shipping'],
    correct: 2,
    total: 2,
    ms: 1200,
    costUsd: 0.0026,
    inputTokens: 1500,
    outputTokens: 300,
    guardrailUnits: 8,
  },
  program: { answers: ['billing', 'billing'], correct: 1, total: 2, ms: 4, costUsd: 0 },
}

function status() {
  return document.querySelector('[data-lab-status]')
}

function nameField(n: number) {
  return screen.getByLabelText(fillTemplate(builderCopy.stepNameLabel, { n }))
}

async function addStepsToMax() {
  const add = screen.getByRole('button', { name: builderCopy.add })
  for (let i = 1; i < MAX_STEPS; i += 1) {
    await userEvent.click(add)
  }
  return add
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
  mocks.env.labLive = false
  mocks.postLab.mockReset()
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
    const add = await addStepsToMax()
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

describe('WorkflowBuilder move, remove and undo', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  async function threeSteps() {
    render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.type(nameField(1), 'One')
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    await userEvent.type(nameField(2), 'Two')
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    await userEvent.type(nameField(3), 'Three')
  }

  it('keeps focus on the same button of the moved step', async () => {
    await threeSteps()
    await userEvent.click(screen.getByRole('button', { name: 'Move Step 2, Two Up' }))
    expect(screen.getByRole('button', { name: 'Move Step 1, Two Up' })).toHaveFocus()
    expect(status()).toHaveTextContent('Moved up. Now Step 1, Two.')
  })

  it('focuses the next step name after a remove, or Add when none is left', async () => {
    await threeSteps()
    await userEvent.click(screen.getByRole('button', { name: 'Remove Step 2, Two' }))
    expect(nameField(2)).toHaveValue('Three')
    expect(nameField(2)).toHaveFocus()
    expect(status()).toHaveTextContent(
      fillTemplate(statusCopy.removed, { step: 'Step 2, Two' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Remove Step 2, Three' }))
    expect(screen.getByRole('button', { name: builderCopy.add })).toHaveFocus()
  })

  it('re-renders the status node when the same removal message repeats', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    await userEvent.click(screen.getByRole('button', { name: builderCopy.add }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove Step 2' }))
    const first = status()?.firstElementChild
    await userEvent.click(screen.getByRole('button', { name: 'Remove Step 2' }))
    const second = status()?.firstElementChild
    expect(second?.textContent).toBe(first?.textContent)
    expect(second).not.toBe(first)
  })

  it('offers Undo that restores the step in place', async () => {
    await threeSteps()
    await userEvent.click(screen.getByRole('button', { name: 'Remove Step 2, Two' }))
    expect(screen.getByText(builderCopy.removedNotice)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: builderCopy.undo }))
    expect(nameField(2)).toHaveValue('Two')
    expect(nameField(2)).toHaveFocus()
    expect(status()).toHaveTextContent('Step 2, Two restored.')
  })

  async function removeWithFakeTimers() {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<WorkflowBuilder snippets={snippets} />)
    await user.click(screen.getByRole('button', { name: builderCopy.add }))
    await user.click(screen.getByRole('button', { name: 'Remove Step 2' }))
    return user
  }

  async function advance(ms: number) {
    vi.setTimerTickMode('manual')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  }

  function undoButton() {
    return screen.queryByRole('button', { name: builderCopy.undo })
  }

  it('withdraws Undo after ten seconds', async () => {
    await removeWithFakeTimers()
    expect(undoButton()).toBeInTheDocument()
    await advance(10_000)
    expect(undoButton()).not.toBeInTheDocument()
  })

  it('pauses the Undo countdown while focus is inside the Undo block', async () => {
    await removeWithFakeTimers()
    act(() => {
      undoButton()?.focus()
    })
    await advance(15_000)
    expect(undoButton()).toBeInTheDocument()
    act(() => {
      screen.getByRole('button', { name: builderCopy.add }).focus()
    })
    await advance(9_999)
    expect(undoButton()).toBeInTheDocument()
    await advance(1)
    expect(undoButton()).not.toBeInTheDocument()
  })

  it('moves focus to Add when Undo expires while it still holds focus', async () => {
    await removeWithFakeTimers()
    const undo = undoButton()
    act(() => {
      undo?.focus()
    })
    fireEvent.blur(undo!, { relatedTarget: null })
    expect(undo).toHaveFocus()
    await advance(10_000)
    expect(undoButton()).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: builderCopy.add })).toHaveFocus()
  })

  it('restarts the countdown after an Undo that held focus unmounts', async () => {
    const user = await removeWithFakeTimers()
    act(() => {
      undoButton()?.focus()
    })
    await user.click(undoButton()!)
    expect(undoButton()).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove Step 2' }))
    expect(undoButton()).toBeInTheDocument()
    await advance(10_000)
    expect(undoButton()).not.toBeInTheDocument()
  })

  it('never announces a restore when Undo is clicked in the same tick that it expires', async () => {
    await removeWithFakeTimers()
    const undo = undoButton()!
    const before = status()?.textContent
    vi.setTimerTickMode('manual')
    act(() => {
      vi.advanceTimersByTime(10_000)
      fireEvent.click(undo)
    })
    expect(undoButton()).not.toBeInTheDocument()
    expect(status()?.textContent).toBe(before)
    expect(status()).not.toHaveTextContent(/restored/)
    expect(screen.getAllByTestId(/^step-\d+$/)).toHaveLength(1)
  })

  it('hides Undo at eight steps and never announces a restore that did not happen', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    const add = await addStepsToMax()
    await userEvent.click(
      within(screen.getByTestId(`step-${String(MAX_STEPS)}`)).getByRole('button', {
        name: `Remove Step ${String(MAX_STEPS)}`,
      }),
    )
    expect(undoButton()).toBeInTheDocument()
    await userEvent.click(add)
    expect(screen.getAllByTestId(/^step-\d+$/)).toHaveLength(MAX_STEPS)
    expect(undoButton()).not.toBeInTheDocument()
    expect(screen.queryByText(builderCopy.removedNotice)).not.toBeInTheDocument()
    expect(status()).not.toHaveTextContent(/restored/)
    expect(nameField(MAX_STEPS)).toHaveFocus()
  })

  it('loads a preset, announces it and keeps focus on the preset button', async () => {
    render(<WorkflowBuilder snippets={snippets} />)
    const load = screen.getByRole('button', { name: 'Load Invoice Intake' })
    await userEvent.click(load)
    expect(screen.getAllByTestId(/^step-\d+$/)).toHaveLength(4)
    expect(nameField(1)).toHaveValue("Read the supplier's invoice PDF")
    expect(status()).toHaveTextContent('Loaded the Invoice Intake example with 4 steps.')
    expect(load).toHaveFocus()
  })

  it('keeps the summary sticky at lg for every visitor and marks it as sticky layout', () => {
    render(<WorkflowBuilder snippets={snippets} />)
    const aside = screen.getByRole('complementary')
    expect(aside).toHaveClass('lg:sticky', 'lg:top-24')
    expect(aside).not.toHaveClass('lg:motion-safe:sticky')
    expect(aside).toHaveAttribute('data-sticky-layout')
  })
})

describe('WorkflowBuilder live lab', () => {
  it('leaves the live lab out unless the build flag is set', () => {
    render(<WorkflowBuilder snippets={snippets} />)
    expect(screen.queryByRole('heading', { name: labLive.panelHeading })).toBeNull()
  })

  it('mounts the live lab after the summary with exactly one status region', () => {
    mocks.env.labLive = true
    const { container } = render(<WorkflowBuilder snippets={snippets} />)
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1)
    const summary = screen.getByRole('heading', { name: summaryCopy.heading })
    const panel = screen.getByRole('heading', { name: labLive.panelHeading })
    expect(
      summary.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('feeds a live-lab run into the builder status region', async () => {
    mocks.env.labLive = true
    const result: LaneState<RaceResult> = { status: 'live', result: RACE, runsLeft: 2 }
    mocks.postLab.mockResolvedValue(result)
    const { container } = render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.type(screen.getByLabelText(labLive.exampleInputLabel(1)), 'Invoice')
    await userEvent.type(
      screen.getByLabelText(labLive.exampleExpectedLabel(1)),
      'billing',
    )
    await userEvent.type(screen.getByLabelText(labLive.exampleInputLabel(2)), 'Parcel')
    await userEvent.type(
      screen.getByLabelText(labLive.exampleExpectedLabel(2)),
      'shipping',
    )
    await userEvent.click(screen.getByRole('button', { name: labLive.raceButton }))
    await waitFor(() => {
      expect(status()).toHaveTextContent(labLive.announceDone(labLive.raceHeading))
    })
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1)
  })

  it('passes the classified verdict and frequency of a step to the live lab', async () => {
    mocks.env.labLive = true
    render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.click(screen.getByRole('button', { name: 'Load Invoice Intake' }))
    const first = presets[0]?.steps[0]
    if (first === undefined) throw new Error('no preset step')
    const picker = screen.getByLabelText(labLive.stepPicker)
    expect(within(picker).getAllByRole('option')).toHaveLength(4)
    expect(screen.getByLabelText(labLive.argueInputLabel)).toHaveValue(first.name)
    const panel = screen
      .getByRole('heading', { name: labLive.panelHeading })
      .closest('section')
    if (panel === null) throw new Error('no panel')
    expect(
      within(panel).getByText(verdictCopy[classifyStep(first.answers).verdict].label),
    ).toBeInTheDocument()
  })

  it('keeps the live lab on the same step when that step is moved', async () => {
    mocks.env.labLive = true
    render(<WorkflowBuilder snippets={snippets} />)
    await userEvent.click(screen.getByRole('button', { name: 'Load Invoice Intake' }))
    const second = presets[0]?.steps[1]
    if (second === undefined) throw new Error('no preset step')
    const picker = screen.getByLabelText(labLive.stepPicker)
    await userEvent.selectOptions(
      picker,
      within(picker).getByRole('option', { name: `Step 2, ${second.name}` }),
    )
    expect(screen.getByLabelText(labLive.argueInputLabel)).toHaveValue(second.name)
    await userEvent.click(
      screen.getByRole('button', { name: `Move Step 2, ${second.name} Up` }),
    )
    expect(screen.getByLabelText(labLive.argueInputLabel)).toHaveValue(second.name)
    expect(within(picker).getByRole('option', { selected: true })).toHaveTextContent(
      `Step 1, ${second.name}`,
    )
  })
})
