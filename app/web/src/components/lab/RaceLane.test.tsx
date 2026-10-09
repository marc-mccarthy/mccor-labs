import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { labLive } from '@/content/lab/copy'
import type { LaneState, RaceResult } from '@/lib/lab'
import { RaceLane } from './RaceLane'

const RESULT: RaceResult = {
  kind: 'race',
  modelLabel: 'Nova 2 Lite',
  pricesAsOf: '2026-10-09',
  model: {
    answers: ['a', 'b', 'a', 'b', 'a'],
    correct: 4,
    total: 5,
    ms: 1234,
    costUsd: 0.00338,
    inputTokens: 1500,
    outputTokens: 300,
    guardrailUnits: 8,
  },
  program: {
    answers: ['a', 'a', 'a', 'a', 'a'],
    correct: 3,
    total: 5,
    ms: 4,
    costUsd: 0,
  },
}

const LIVE: LaneState<RaceResult> = { status: 'live', result: RESULT, runsLeft: 7 }
const RECORDED_AT = '2026-10-09T14:30:00Z'
const RECORDED_TIME = 'Oct 9, 2026, 2:30 PM UTC'

function recorded(reason: 'cap' | 'off' | 'preview'): LaneState<RaceResult> {
  return {
    status: 'recorded',
    reason,
    recordedAt: RECORDED_AT,
    result: RESULT,
    runsLeft: null,
  }
}

function programRow(): HTMLElement {
  const row = screen.getByRole('row', { name: new RegExp(labLive.laneProgram) })
  return row
}

describe('RaceLane', () => {
  it('shows only the trigger when idle', () => {
    const { container } = render(<RaceLane state={{ status: 'idle' }} onRun={vi.fn()} />)
    expect(screen.getByRole('button', { name: labLive.raceButton })).toBeInTheDocument()
    expect(container.querySelector('section, table, [role="alert"]')).toBeNull()
  })

  it('shows no trigger without onRun', () => {
    render(<RaceLane state={recorded('preview')} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('marks the running state busy and disabled without removing the trigger', async () => {
    const onRun = vi.fn()
    const { container } = render(<RaceLane state={{ status: 'running' }} onRun={onRun} />)
    const trigger = screen.getByRole('button', { name: labLive.racing })
    expect(trigger).toHaveAttribute('aria-disabled', 'true')
    expect(trigger).not.toBeDisabled()
    expect(container.querySelector('section')).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(trigger)
    expect(onRun).not.toHaveBeenCalled()
  })

  it('shows the live result with accuracy before the time cell', () => {
    render(<RaceLane state={LIVE} onRun={vi.fn()} />)
    const accuracy = screen.getByRole('cell', { name: '4 of 5 correct' })
    const modelRow = accuracy.closest('tr')
    if (modelRow === null) throw new Error('no row')
    const time = within(modelRow).getByRole('cell', { name: /1\.23\s*s/ })
    expect(
      accuracy.compareDocumentPosition(time) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('orders the rows model then program and uses a dash for program tokens', () => {
    render(<RaceLane state={LIVE} />)
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(rows[1]).toHaveTextContent('Nova 2 Lite')
    expect(rows[2]).toBe(programRow())
    const cells = within(programRow()).getAllByRole('cell')
    expect(cells[2]).toHaveTextContent(/^-$/)
    expect(within(programRow()).queryByText('tokens')).toBeNull()
  })

  it('puts the aligned mono classes on the cells, not the inline spans', () => {
    render(<RaceLane state={LIVE} />)
    const header = screen.getByRole('columnheader', { name: labLive.columns.accuracy })
    const cell = screen.getByRole('cell', { name: '4 of 5 correct' })
    for (const element of [header, cell]) {
      expect(element).toHaveClass('font-mono', 'tabular-nums', 'text-right')
    }
    for (const name of [
      labLive.columns.time,
      labLive.columns.tokens,
      labLive.columns.cost,
    ]) {
      expect(screen.getByRole('columnheader', { name })).toHaveClass(
        'font-mono',
        'tabular-nums',
        'text-right',
      )
    }
    const modelRow = cell.closest('tr')
    if (modelRow === null) throw new Error('no row')
    for (const unit of ['s', 'tokens', 'USD']) {
      const span = within(modelRow).getByText(unit, { selector: 'span' })
      expect(span).toHaveClass('text-muted')
      expect(span).not.toHaveClass('text-right')
      expect(span.closest('td')).toHaveClass('font-mono', 'tabular-nums', 'text-right')
    }
  })

  it('renders the model cost as 0.0034 USD', () => {
    render(<RaceLane state={LIVE} />)
    const modelRow = screen.getByRole('cell', { name: '4 of 5 correct' }).closest('tr')
    if (modelRow === null) throw new Error('no row')
    const cells = within(modelRow).getAllByRole('cell')
    expect(cells[3]).toHaveTextContent('0.0034 USD')
  })

  it('renders an exact zero program cost as 0 USD', () => {
    render(<RaceLane state={LIVE} />)
    expect(within(programRow()).getAllByRole('cell')[3]).toHaveTextContent(/^0 USD$/)
  })

  it('renders the caption as muted mono text', () => {
    render(<RaceLane state={LIVE} />)
    expect(screen.getByText(labLive.measured)).toHaveClass('text-muted', 'font-mono')
  })

  it('shows runs left and the live cost label for a live result', () => {
    render(<RaceLane state={LIVE} examples={5} frequency="daily" />)
    expect(screen.getByText(labLive.runsLeft(7))).toBeInTheDocument()
    expect(screen.getByText(labLive.costOfRun, { exact: false })).toBeInTheDocument()
    expect(screen.getByText(/^If this runs once a day,/)).toBeInTheDocument()
  })

  it('shows the cap label and the recorded cost', () => {
    render(<RaceLane state={recorded('cap')} />)
    expect(screen.getByText(labLive.recordedCap(RECORDED_TIME))).toBeInTheDocument()
    expect(screen.getByText(labLive.recordedCost, { exact: false })).toBeInTheDocument()
    expect(screen.queryByText(/live runs left today/)).toBeNull()
  })

  it('shows the off label', () => {
    render(<RaceLane state={recorded('off')} />)
    expect(screen.getByText(labLive.recordedOff(RECORDED_TIME))).toBeInTheDocument()
  })

  it('shows the preview label', () => {
    render(<RaceLane state={recorded('preview')} />)
    expect(screen.getByText(labLive.recordedPreview(RECORDED_TIME))).toBeInTheDocument()
  })

  it('shows the blocked text and no table', () => {
    const { container } = render(
      <RaceLane
        state={{ status: 'blocked', stage: 'input', runsLeft: 3 }}
        onRun={vi.fn()}
      />,
    )
    expect(screen.getByText(labLive.blocked)).toBeInTheDocument()
    expect(container.querySelector('table')).toBeNull()
  })

  it.each([
    ['network', labLive.errorNetwork],
    ['server', labLive.errorServer],
    ['timeout', labLive.errorTimeout],
    ['validation', labLive.errorValidation],
  ] as const)('shows a %s error as an alert with Retry', (reason, text) => {
    render(<RaceLane state={{ status: 'error', reason }} onRun={vi.fn()} />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(text)
    expect(within(alert).getByRole('button', { name: labLive.retry })).toBeInTheDocument()
  })

  it('moves focus to the trigger and runs once on Retry', async () => {
    const onRun = vi.fn()
    render(<RaceLane state={{ status: 'error', reason: 'server' }} onRun={onRun} />)
    await userEvent.click(screen.getByRole('button', { name: labLive.retry }))
    expect(onRun).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: labLive.raceButton })).toHaveFocus()
  })

  it('keeps focus on the trigger after a click', async () => {
    const onRun = vi.fn()
    render(<RaceLane state={{ status: 'idle' }} onRun={onRun} />)
    const trigger = screen.getByRole('button', { name: labLive.raceButton })
    await userEvent.click(trigger)
    expect(onRun).toHaveBeenCalledTimes(1)
    expect(trigger).toHaveFocus()
  })

  it('describes the disabled reason and ignores clicks', async () => {
    const onRun = vi.fn()
    render(
      <RaceLane
        state={{ status: 'idle' }}
        onRun={onRun}
        disabledReason={labLive.raceNeedsExamples}
      />,
    )
    const trigger = screen.getByRole('button', { name: labLive.raceButton })
    expect(trigger).toHaveAttribute('aria-disabled', 'true')
    expect(trigger).toHaveAccessibleDescription('Fill in at least 2 examples')
    expect(screen.getByText(labLive.raceNeedsExamples)).toHaveClass('text-muted')
    await userEvent.click(trigger)
    expect(onRun).not.toHaveBeenCalled()
  })

  it('does not run from Retry while the trigger is disabled', async () => {
    const onRun = vi.fn()
    render(
      <RaceLane
        state={{ status: 'error', reason: 'server' }}
        onRun={onRun}
        disabledReason={labLive.raceNeedsExamples}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: labLive.retry }))
    expect(onRun).not.toHaveBeenCalled()
  })

  it('gives every button the md height', () => {
    render(<RaceLane state={{ status: 'error', reason: 'server' }} onRun={vi.fn()} />)
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveClass('h-11')
    }
  })

  it('renders no progress indicator in any state', () => {
    const states: LaneState<RaceResult>[] = [{ status: 'running' }, LIVE, recorded('cap')]
    for (const state of states) {
      const { container, unmount } = render(<RaceLane state={state} onRun={vi.fn()} />)
      expect(container.querySelector('progress, meter, [role="progressbar"]')).toBeNull()
      unmount()
    }
  })
})
