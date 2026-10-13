import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { labLive, verdictCopy } from '@/content/lab/copy'
import { VERDICTS, type Verdict } from '@/content/lab/rubric'
import type { ArgueResult, LaneState } from '@/lib/lab'
import { ArgueLane } from './ArgueLane'
import { VERDICT_STYLE } from './verdictStyle'

const RESULT: ArgueResult = {
  kind: 'argue',
  modelLabel: 'Nova 2 Lite',
  pricesAsOf: '2026-10-09',
  text: 'A checklist would be cheaper and easier to audit.',
  ms: 1500,
  inputTokens: 600,
  outputTokens: 120,
  guardrailUnits: 6,
  costUsd: 0.0023,
}

const LIVE: LaneState<ArgueResult> = { status: 'live', result: RESULT, runsLeft: 9 }
const RECORDED_AT = '2026-10-09T14:30:00Z'
const RECORDED_TIME = 'Oct 9, 2026, 2:30 PM UTC'

function recorded(reason: 'cap' | 'off' | 'preview'): LaneState<ArgueResult> {
  return {
    status: 'recorded',
    reason,
    recordedAt: RECORDED_AT,
    result: RESULT,
    runsLeft: null,
  }
}

interface Overrides {
  state?: LaneState<ArgueResult>
  verdict?: Verdict
  summary?: string
  onRun?: () => void
  onSummaryChange?: (value: string) => void
  recordedSummary?: string
  disabledReason?: string
}

function setup(overrides: Overrides = {}) {
  const props = {
    summary: 'Sort incoming mail',
    onSummaryChange: vi.fn(),
    verdict: 'rules' as Verdict,
    state: { status: 'idle' } as LaneState<ArgueResult>,
    onRun: vi.fn(),
    ...overrides,
  }
  return { ...render(<ArgueLane {...props} />), props }
}

function carries(element: Element, classes: string): boolean {
  return classes.split(' ').every((cls) => element.classList.contains(cls))
}

function resultSection(container: HTMLElement): HTMLElement {
  const section = container.querySelector('section')
  if (section === null) throw new Error('no result section')
  return section
}

describe('ArgueLane', () => {
  it('shows the labelled input described by the notice and the trigger when idle', () => {
    const { container } = setup()
    const field = screen.getByLabelText(labLive.argueInputLabel)
    expect(field.tagName).toBe('TEXTAREA')
    expect(field).toHaveAttribute('maxlength', '300')
    expect(field).toHaveAccessibleDescription(labLive.inputNotice)
    expect(screen.getByRole('button', { name: labLive.argueButton })).toBeInTheDocument()
    expect(container.querySelector('section, [role="alert"]')).toBeNull()
  })

  it('reports typing through onSummaryChange', async () => {
    const { props } = setup({ summary: '' })
    await userEvent.type(screen.getByLabelText(labLive.argueInputLabel), 'a')
    expect(props.onSummaryChange).toHaveBeenCalledWith('a')
  })

  it('marks the running state busy and disabled and ignores clicks', async () => {
    const { container, props } = setup({ state: { status: 'running' } })
    const trigger = screen.getByRole('button', { name: labLive.arguing })
    expect(trigger).toHaveAttribute('aria-disabled', 'true')
    expect(resultSection(container)).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(trigger)
    expect(props.onRun).not.toHaveBeenCalled()
  })

  it('shows the live text, attribution, cost and runs left', () => {
    setup({ state: LIVE })
    expect(screen.getByText(RESULT.text)).toBeInTheDocument()
    expect(screen.getByText(labLive.argueAttribution)).toHaveClass(
      'font-mono',
      'text-muted',
    )
    expect(screen.getByText(labLive.costOfRun, { exact: false })).toBeInTheDocument()
    expect(screen.getByText(labLive.runsLeft(9))).toBeInTheDocument()
    expect(screen.queryByText(/If this runs/)).toBeNull()
  })

  it('shows the cap label, recorded cost and the example step', () => {
    setup({ state: recorded('cap'), recordedSummary: 'Sort mail' })
    expect(screen.getByText(labLive.recordedCap(RECORDED_TIME))).toBeInTheDocument()
    expect(screen.getByText(labLive.recordedArgueFor('Sort mail'))).toBeInTheDocument()
    expect(screen.getByText(labLive.recordedCost, { exact: false })).toBeInTheDocument()
  })

  it('shows the off label and the preview label', () => {
    const { unmount } = setup({ state: recorded('off') })
    expect(screen.getByText(labLive.recordedOff(RECORDED_TIME))).toBeInTheDocument()
    unmount()
    setup({ state: recorded('preview') })
    expect(screen.getByText(labLive.recordedPreview(RECORDED_TIME))).toBeInTheDocument()
  })

  it('shows the blocked text without a result section', () => {
    const { container } = setup({
      state: { status: 'blocked', stage: 'output', runsLeft: 2 },
    })
    expect(screen.getByText(labLive.blocked)).toBeInTheDocument()
    expect(container.querySelector('section')).toBeNull()
  })

  it.each([
    ['network', labLive.errorNetwork],
    ['server', labLive.errorServer],
    ['timeout', labLive.errorTimeout],
    ['validation', labLive.argueErrorValidation],
  ] as const)('shows a %s error as an alert with Retry', (reason, text) => {
    setup({ state: { status: 'error', reason } })
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(text)
    expect(within(alert).getByRole('button', { name: labLive.retry })).toBeInTheDocument()
  })

  it('moves focus to the trigger and runs once on Retry', async () => {
    const { props } = setup({ state: { status: 'error', reason: 'server' } })
    await userEvent.click(screen.getByRole('button', { name: labLive.retry }))
    expect(props.onRun).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: labLive.argueButton })).toHaveFocus()
  })

  it('uses argue wording for the validation error, not the race wording', () => {
    setup({ state: { status: 'error', reason: 'validation' } })
    expect(screen.getByRole('alert')).not.toHaveTextContent(labLive.errorValidation)
  })

  it('describes the disabled reason and ignores clicks', async () => {
    const { props } = setup({ disabledReason: labLive.argueDisabledNoName })
    const trigger = screen.getByRole('button', { name: labLive.argueButton })
    expect(trigger).toHaveAttribute('aria-disabled', 'true')
    expect(trigger).toHaveAccessibleDescription(labLive.argueDisabledNoName)
    await userEvent.click(trigger)
    expect(props.onRun).not.toHaveBeenCalled()
  })

  it('does not run from Retry while the trigger is disabled', async () => {
    const { props } = setup({
      state: { status: 'error', reason: 'validation' },
      disabledReason: labLive.argueDisabledNoName,
    })
    await userEvent.click(screen.getByRole('button', { name: labLive.retry }))
    expect(props.onRun).not.toHaveBeenCalled()
  })

  it('keeps focus on the trigger after a click', async () => {
    const { props } = setup()
    const trigger = screen.getByRole('button', { name: labLive.argueButton })
    await userEvent.click(trigger)
    expect(props.onRun).toHaveBeenCalledTimes(1)
    expect(trigger).toHaveFocus()
  })

  it('renders model text literally', () => {
    setup({
      state: { status: 'live', result: { ...RESULT, text: '<b>x</b>' }, runsLeft: 1 },
    })
    expect(screen.getByText('<b>x</b>')).toBeInTheDocument()
    expect(document.querySelector('b')).toBeNull()
  })

  it('puts the verdict badge before the argue text', () => {
    setup({ state: LIVE })
    const badge = screen.getByText(verdictCopy.rules.label)
    const text = screen.getByText(RESULT.text)
    expect(
      badge.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('places the verdict line after the trigger and before the result', () => {
    const { container } = setup({ state: LIVE })
    const trigger = screen.getByRole('button', { name: labLive.argueButton })
    const label = screen.getByText(labLive.argueVerdictLabel)
    const section = resultSection(container)
    expect(
      trigger.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      label.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('backs the argue text with the elevated surface', () => {
    setup({ state: LIVE })
    expect(screen.getByText(RESULT.text)).toHaveClass('bg-elevated')
  })

  it('uses the inline marker and never the card rule for do-not-automate', () => {
    const { container } = setup({ verdict: 'do-not-automate', state: LIVE })
    const badge = screen.getByText(verdictCopy['do-not-automate'].label)
    const marker = badge.querySelector('[aria-hidden="true"]')
    expect(marker).not.toBeNull()
    for (const cls of VERDICT_STYLE['do-not-automate'].marker.split(' ')) {
      expect(marker).toHaveClass(cls)
    }
    expect(marker).not.toHaveClass('absolute')
    const rule = VERDICT_STYLE['do-not-automate'].cardRule ?? ''
    expect(rule).not.toBe('')
    expect([...container.querySelectorAll('*')].some((el) => carries(el, rule))).toBe(
      false,
    )
  })

  it('keeps verdict color, markers and labels out of the result section', () => {
    const { container } = setup({ verdict: 'language-model', state: recorded('cap') })
    const section = resultSection(container)
    for (const element of section.querySelectorAll('*')) {
      expect(element.getAttribute('class') ?? '').not.toMatch(
        /\b(text|border|bg)-(accent|brand)\b/,
      )
      for (const v of VERDICTS) {
        expect(carries(element, VERDICT_STYLE[v].marker)).toBe(false)
        expect(element.textContent === verdictCopy[v].label).toBe(false)
      }
    }
  })

  it('gives every button the md height', () => {
    setup({ state: { status: 'error', reason: 'server' } })
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveClass('h-11')
    }
  })
})
