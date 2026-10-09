import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { labLive, verdictCopy } from '@/content/lab/copy'
import {
  parseArgueResult,
  parseRaceResult,
  type ArgueResult,
  type LaneState,
  type RaceResult,
} from '@/lib/lab'
import { LiveLabPanel, type LiveLabStep } from './LiveLabPanel'

const postLab = vi.hoisted(() => vi.fn())

vi.mock('@/lib/lab', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/lab')>()),
  postLab,
}))

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

const ARGUE: ArgueResult = {
  kind: 'argue',
  modelLabel: 'Nova 2 Lite',
  pricesAsOf: '2026-10-09',
  text: 'A simple program would do this.',
  ms: 1400,
  inputTokens: 600,
  outputTokens: 120,
  guardrailUnits: 6,
  costUsd: 0.0023,
}

const STEPS: LiveLabStep[] = [
  {
    id: 'step-1',
    name: 'Sort incoming mail',
    verdict: 'language-model',
    frequency: 'daily',
  },
  { id: 'step-2', name: 'Approve refunds', verdict: 'do-not-automate', frequency: null },
]

function liveRace(): LaneState<RaceResult> {
  return { status: 'live', result: RACE, runsLeft: 3 }
}

function liveArgue(): LaneState<ArgueResult> {
  return { status: 'live', result: ARGUE, runsLeft: 4 }
}

async function fillExamples() {
  await userEvent.type(
    screen.getByLabelText(labLive.exampleInputLabel(1)),
    'Invoice from Acme',
  )
  await userEvent.type(screen.getByLabelText(labLive.exampleExpectedLabel(1)), 'billing')
  await userEvent.type(
    screen.getByLabelText(labLive.exampleInputLabel(2)),
    'Parcel is late',
  )
  await userEvent.type(screen.getByLabelText(labLive.exampleExpectedLabel(2)), 'shipping')
}

beforeEach(() => {
  postLab.mockReset()
})

describe('LiveLabPanel', () => {
  it('renders the heading and a step picker numbered by step', () => {
    render(<LiveLabPanel steps={STEPS} onAnnounce={vi.fn()} />)
    expect(
      screen.getByRole('heading', { name: labLive.panelHeading }),
    ).toBeInTheDocument()
    const picker = screen.getByLabelText(labLive.stepPicker)
    expect(
      within(picker)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Step 1, Sort incoming mail', 'Step 2, Approve refunds'])
  })

  it('renders no status region and no live region of its own', () => {
    const { container } = render(<LiveLabPanel steps={STEPS} onAnnounce={vi.fn()} />)
    expect(container.querySelector('[role="status"], [aria-live]')).toBeNull()
  })

  it('renders nothing without steps', () => {
    const { container } = render(<LiveLabPanel steps={[]} onAnnounce={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('prefills the argue summary and verdict from the chosen step', () => {
    render(<LiveLabPanel steps={STEPS} onAnnounce={vi.fn()} />)
    expect(screen.getByLabelText(labLive.argueInputLabel)).toHaveValue(
      'Sort incoming mail',
    )
    expect(screen.getByText(verdictCopy['language-model'].label)).toBeInTheDocument()
  })

  it('follows the step name until the visitor edits the summary', async () => {
    const onAnnounce = vi.fn()
    const { rerender } = render(<LiveLabPanel steps={STEPS} onAnnounce={onAnnounce} />)
    const renamed = [{ ...STEPS[0], name: 'Sort mail' } as LiveLabStep, ...STEPS.slice(1)]
    rerender(<LiveLabPanel steps={renamed} onAnnounce={onAnnounce} />)
    const field = screen.getByLabelText(labLive.argueInputLabel)
    expect(field).toHaveValue('Sort mail')
    await userEvent.type(field, '!')
    const again = [{ ...STEPS[0], name: 'Other' } as LiveLabStep, ...STEPS.slice(1)]
    rerender(<LiveLabPanel steps={again} onAnnounce={onAnnounce} />)
    expect(field).toHaveValue('Sort mail!')
  })

  it('announces running then done for a race and sends trimmed examples', async () => {
    postLab.mockResolvedValue(liveRace())
    const onAnnounce = vi.fn()
    render(<LiveLabPanel steps={STEPS} onAnnounce={onAnnounce} />)
    await fillExamples()
    await userEvent.click(screen.getByRole('button', { name: labLive.raceButton }))
    await waitFor(() => {
      expect(screen.getByText('2 of 2 correct')).toBeInTheDocument()
    })
    expect(postLab).toHaveBeenCalledWith(
      'race',
      {
        examples: [
          { input: 'Invoice from Acme', expected: 'billing' },
          { input: 'Parcel is late', expected: 'shipping' },
        ],
      },
      parseRaceResult,
    )
    expect(onAnnounce.mock.calls).toEqual([
      [labLive.announceRunning(labLive.raceHeading)],
      [labLive.announceDone(labLive.raceHeading)],
    ])
  })

  it('announces running then done for an argue run and sends the step verdict', async () => {
    postLab.mockResolvedValue(liveArgue())
    const onAnnounce = vi.fn()
    render(<LiveLabPanel steps={STEPS} onAnnounce={onAnnounce} />)
    await userEvent.click(screen.getByRole('button', { name: labLive.argueButton }))
    await waitFor(() => {
      expect(screen.getByText(ARGUE.text)).toBeInTheDocument()
    })
    expect(postLab).toHaveBeenCalledWith(
      'argue',
      { stepSummary: 'Sort incoming mail', verdict: 'language-model' },
      parseArgueResult,
    )
    expect(onAnnounce.mock.calls).toEqual([
      [labLive.announceRunning(labLive.argueHeading)],
      [labLive.announceDone(labLive.argueHeading)],
    ])
  })

  it('adds no second announcement for a server error', async () => {
    postLab.mockResolvedValue({ status: 'error', reason: 'server' })
    const onAnnounce = vi.fn()
    render(<LiveLabPanel steps={STEPS} onAnnounce={onAnnounce} />)
    await userEvent.click(screen.getByRole('button', { name: labLive.argueButton }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(labLive.errorServer)
    })
    expect(onAnnounce).toHaveBeenCalledTimes(1)
  })

  it('resets both lanes, the summary and the badge when the step changes', async () => {
    postLab.mockImplementation((kind: string) =>
      Promise.resolve(kind === 'race' ? liveRace() : liveArgue()),
    )
    const { container } = render(<LiveLabPanel steps={STEPS} onAnnounce={vi.fn()} />)
    await fillExamples()
    await userEvent.click(screen.getByRole('button', { name: labLive.raceButton }))
    await userEvent.click(screen.getByRole('button', { name: labLive.argueButton }))
    await waitFor(() => {
      expect(container.querySelectorAll('section')).toHaveLength(3)
    })
    await userEvent.type(screen.getByLabelText(labLive.argueInputLabel), ' now')
    await userEvent.selectOptions(screen.getByLabelText(labLive.stepPicker), 'step-2')
    expect(container.querySelectorAll('section[aria-labelledby]')).toHaveLength(1)
    expect(screen.queryByText(ARGUE.text)).toBeNull()
    expect(screen.queryByText('2 of 2 correct')).toBeNull()
    expect(screen.getByLabelText(labLive.argueInputLabel)).toHaveValue('Approve refunds')
    expect(screen.getByText(verdictCopy['do-not-automate'].label)).toBeInTheDocument()
    expect(screen.queryByText(verdictCopy['language-model'].label)).toBeNull()
  })

  it('disables the race trigger with a described reason until two examples are filled', async () => {
    render(<LiveLabPanel steps={STEPS} onAnnounce={vi.fn()} />)
    const trigger = screen.getByRole('button', { name: labLive.raceButton })
    expect(trigger).toHaveAttribute('aria-disabled', 'true')
    expect(trigger).toHaveAccessibleDescription('Fill in at least 2 examples')
    await userEvent.click(trigger)
    expect(postLab).not.toHaveBeenCalled()
    await fillExamples()
    expect(trigger).not.toHaveAttribute('aria-disabled')
    expect(trigger).not.toHaveAttribute('aria-describedby')
  })

  it('keeps the examples when the step changes', async () => {
    render(<LiveLabPanel steps={STEPS} onAnnounce={vi.fn()} />)
    await userEvent.type(screen.getByLabelText(labLive.exampleInputLabel(1)), 'keep me')
    await userEvent.selectOptions(screen.getByLabelText(labLive.stepPicker), 'step-2')
    expect(screen.getByLabelText(labLive.exampleInputLabel(1))).toHaveValue('keep me')
  })

  it('clamps the selection when the steps shrink', async () => {
    const { rerender } = render(<LiveLabPanel steps={STEPS} onAnnounce={vi.fn()} />)
    await userEvent.selectOptions(screen.getByLabelText(labLive.stepPicker), 'step-2')
    rerender(<LiveLabPanel steps={STEPS.slice(0, 1)} onAnnounce={vi.fn()} />)
    expect(screen.getByLabelText(labLive.argueInputLabel)).toHaveValue(
      'Sort incoming mail',
    )
  })

  it('disables argue with a described reason while the summary is blank', async () => {
    const steps: LiveLabStep[] = [{ ...STEPS[0], name: '' } as LiveLabStep]
    render(<LiveLabPanel steps={steps} onAnnounce={vi.fn()} />)
    const trigger = screen.getByRole('button', { name: labLive.argueButton })
    expect(trigger).toHaveAttribute('aria-disabled', 'true')
    expect(trigger).toHaveAccessibleDescription(labLive.argueDisabledNoName)
    await userEvent.click(trigger)
    expect(postLab).not.toHaveBeenCalled()
    await userEvent.type(screen.getByLabelText(labLive.argueInputLabel), '   ')
    expect(trigger).toHaveAttribute('aria-disabled', 'true')
    await userEvent.type(screen.getByLabelText(labLive.argueInputLabel), 'Pay suppliers')
    expect(trigger).not.toHaveAttribute('aria-disabled')
  })

  it('stays on the same step through a reorder', async () => {
    const onAnnounce = vi.fn()
    const { rerender } = render(<LiveLabPanel steps={STEPS} onAnnounce={onAnnounce} />)
    await userEvent.selectOptions(screen.getByLabelText(labLive.stepPicker), 'step-2')
    rerender(
      <LiveLabPanel
        steps={[STEPS[1], STEPS[0]] as LiveLabStep[]}
        onAnnounce={onAnnounce}
      />,
    )
    expect(screen.getByLabelText(labLive.stepPicker)).toHaveValue('step-2')
    expect(screen.getByLabelText(labLive.argueInputLabel)).toHaveValue('Approve refunds')
  })

  it('falls back to the first step when the selected step is removed', async () => {
    const onAnnounce = vi.fn()
    const { rerender } = render(<LiveLabPanel steps={STEPS} onAnnounce={onAnnounce} />)
    await userEvent.selectOptions(screen.getByLabelText(labLive.stepPicker), 'step-2')
    rerender(<LiveLabPanel steps={[STEPS[0]] as LiveLabStep[]} onAnnounce={onAnnounce} />)
    expect(screen.getByLabelText(labLive.stepPicker)).toHaveValue('step-1')
    expect(screen.getByLabelText(labLive.argueInputLabel)).toHaveValue(
      'Sort incoming mail',
    )
  })

  it('resets the argue lane when the verdict of the selected step changes', async () => {
    postLab.mockResolvedValue(liveArgue())
    const onAnnounce = vi.fn()
    const { rerender } = render(<LiveLabPanel steps={STEPS} onAnnounce={onAnnounce} />)
    await userEvent.click(screen.getByRole('button', { name: labLive.argueButton }))
    await waitFor(() => {
      expect(screen.getByText(ARGUE.text)).toBeInTheDocument()
    })
    const changed = [
      { ...STEPS[0], verdict: 'rules' } as LiveLabStep,
      STEPS[1],
    ] as LiveLabStep[]
    rerender(<LiveLabPanel steps={changed} onAnnounce={onAnnounce} />)
    expect(screen.queryByText(ARGUE.text)).toBeNull()
    expect(screen.getByText(verdictCopy.rules.label)).toBeInTheDocument()
  })

  it('locks the step picker while a lane runs and ignores changes', async () => {
    let finish: (state: LaneState<ArgueResult>) => void = () => undefined
    postLab.mockReturnValue(
      new Promise<LaneState<ArgueResult>>((resolve) => {
        finish = resolve
      }),
    )
    render(<LiveLabPanel steps={STEPS} onAnnounce={vi.fn()} />)
    const picker = screen.getByLabelText(labLive.stepPicker)
    expect(picker).not.toHaveAttribute('aria-disabled')
    await userEvent.click(screen.getByRole('button', { name: labLive.argueButton }))
    expect(picker).toHaveAttribute('aria-disabled', 'true')
    expect(picker).toHaveAccessibleDescription(labLive.stepPickerBusy)
    await userEvent.selectOptions(picker, 'step-2')
    expect(picker).toHaveValue('step-1')
    finish(liveArgue())
    await waitFor(() => {
      expect(picker).not.toHaveAttribute('aria-disabled')
    })
    await userEvent.selectOptions(picker, 'step-2')
    expect(picker).toHaveValue('step-2')
  })

  it('races only the filled examples when a third one is blank', async () => {
    postLab.mockResolvedValue(liveRace())
    render(<LiveLabPanel steps={STEPS} onAnnounce={vi.fn()} />)
    await fillExamples()
    await userEvent.click(screen.getByRole('button', { name: labLive.addExample }))
    const trigger = screen.getByRole('button', { name: labLive.raceButton })
    expect(trigger).not.toHaveAttribute('aria-disabled')
    await userEvent.click(trigger)
    expect(postLab).toHaveBeenCalledWith(
      'race',
      {
        examples: [
          { input: 'Invoice from Acme', expected: 'billing' },
          { input: 'Parcel is late', expected: 'shipping' },
        ],
      },
      parseRaceResult,
    )
  })
})
