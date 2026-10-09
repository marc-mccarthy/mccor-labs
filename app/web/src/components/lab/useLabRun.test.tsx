import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { labLive } from '@/content/lab/copy'
import {
  parseArgueResult,
  parseRaceResult,
  type ArgueRequest,
  type LaneState,
  type RaceRequest,
  type RaceResult,
} from '@/lib/lab'
import { useLabRun } from './useLabRun'

const parse = parseRaceResult

const RACE: RaceResult = {
  kind: 'race',
  modelLabel: 'Nova 2 Lite',
  pricesAsOf: '2026-10-09',
  model: {
    answers: ['a', 'b'],
    correct: 2,
    total: 2,
    ms: 1234,
    costUsd: 0.0026,
    inputTokens: 1500,
    outputTokens: 300,
    guardrailUnits: 8,
  },
  program: { answers: ['a', 'a'], correct: 1, total: 2, ms: 4, costUsd: 0 },
}

const REQUEST: RaceRequest = {
  examples: [
    { input: 'Invoice from Acme', expected: 'billing' },
    { input: 'Where is my parcel', expected: 'shipping' },
  ],
}

const ARGUE_REQUEST: ArgueRequest = {
  stepSummary: 'Sort incoming mail',
  verdict: 'language-model',
}

const RECORDED_AT = '2026-10-09T14:30:00Z'
const RECORDED_TIME = 'Oct 9, 2026, 2:30 PM UTC'
const LANE = 'Race this step'

function setup(outcome: LaneState<RaceResult> | Promise<LaneState<RaceResult>>) {
  const run = vi.fn().mockReturnValue(Promise.resolve(outcome))
  const onAnnounce = vi.fn()
  const hook = renderHook(() => useLabRun('race', parse, LANE, onAnnounce, run))
  return { run, onAnnounce, hook }
}

async function runOnce(outcome: LaneState<RaceResult>) {
  const ctx = setup(outcome)
  act(() => {
    ctx.hook.result.current.start(REQUEST)
  })
  await waitFor(() => {
    expect(ctx.hook.result.current.state.status).toBe(outcome.status)
  })
  return ctx
}

describe('useLabRun', () => {
  it('goes from idle to running to live and passes the request through', async () => {
    let finish: (state: LaneState<RaceResult>) => void = () => undefined
    const run = vi.fn().mockReturnValue(
      new Promise<LaneState<RaceResult>>((resolve) => {
        finish = resolve
      }),
    )
    const onAnnounce = vi.fn()
    const { result } = renderHook(() => useLabRun('race', parse, LANE, onAnnounce, run))
    expect(result.current.state).toEqual({ status: 'idle' })
    act(() => {
      result.current.start(REQUEST)
    })
    expect(result.current.state).toEqual({ status: 'running' })
    expect(run).toHaveBeenCalledWith('race', REQUEST, parse)
    await act(async () => {
      finish({ status: 'live', result: RACE, runsLeft: 2 })
      await Promise.resolve()
    })
    expect(result.current.state).toEqual({ status: 'live', result: RACE, runsLeft: 2 })
  })

  it('ignores a second start while running', async () => {
    const { run, hook } = setup({ status: 'live', result: RACE, runsLeft: 1 })
    act(() => {
      hook.result.current.start(REQUEST)
      hook.result.current.start({ examples: [] })
    })
    await waitFor(() => {
      expect(hook.result.current.state.status).toBe('live')
    })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('runs again after a finish', async () => {
    const { run, hook } = setup({ status: 'live', result: RACE, runsLeft: 1 })
    act(() => {
      hook.result.current.start(REQUEST)
    })
    await waitFor(() => {
      expect(hook.result.current.state.status).toBe('live')
    })
    act(() => {
      hook.result.current.start({ examples: [] })
    })
    await waitFor(() => {
      expect(run).toHaveBeenCalledTimes(2)
    })
  })

  it('announces running then done for a live result', async () => {
    const { onAnnounce } = await runOnce({ status: 'live', result: RACE, runsLeft: 1 })
    expect(onAnnounce.mock.calls).toEqual([
      [labLive.announceRunning(LANE)],
      [labLive.announceDone(LANE)],
    ])
  })

  it('announces the recording time for a cap result in UTC', async () => {
    const { onAnnounce } = await runOnce({
      status: 'recorded',
      reason: 'cap',
      recordedAt: RECORDED_AT,
      result: RACE,
      runsLeft: 0,
    })
    expect(onAnnounce).toHaveBeenLastCalledWith(labLive.recordedCap(RECORDED_TIME))
  })

  it('announces the recording time for an off result', async () => {
    const { onAnnounce } = await runOnce({
      status: 'recorded',
      reason: 'off',
      recordedAt: RECORDED_AT,
      result: RACE,
      runsLeft: null,
    })
    expect(onAnnounce).toHaveBeenLastCalledWith(labLive.recordedOff(RECORDED_TIME))
  })

  it('announces the recording time for a preview result', async () => {
    const { onAnnounce } = await runOnce({
      status: 'recorded',
      reason: 'preview',
      recordedAt: RECORDED_AT,
      result: RACE,
      runsLeft: null,
    })
    expect(onAnnounce).toHaveBeenLastCalledWith(labLive.recordedPreview(RECORDED_TIME))
  })

  it('announces the blocked text', async () => {
    const { onAnnounce } = await runOnce({
      status: 'blocked',
      stage: 'input',
      runsLeft: 4,
    })
    expect(onAnnounce).toHaveBeenLastCalledWith(labLive.blocked)
  })

  it.each(['network', 'server', 'timeout', 'validation'] as const)(
    'announces nothing beyond the running text on a %s error',
    async (reason) => {
      const { onAnnounce } = await runOnce({ status: 'error', reason })
      expect(onAnnounce).toHaveBeenCalledTimes(1)
      expect(onAnnounce).toHaveBeenCalledWith(labLive.announceRunning(LANE))
    },
  )

  it('falls back to a network error when the run rejects', async () => {
    const run = vi.fn().mockRejectedValue(new Error('boom'))
    const onAnnounce = vi.fn()
    const { result } = renderHook(() =>
      useLabRun('argue', parseArgueResult, LANE, onAnnounce, run),
    )
    act(() => {
      result.current.start(ARGUE_REQUEST)
    })
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'error', reason: 'network' })
    })
    expect(onAnnounce).toHaveBeenCalledTimes(1)
  })

  it('does not announce or set state after unmount', async () => {
    let finish: (state: LaneState<RaceResult>) => void = () => undefined
    const run = vi.fn().mockReturnValue(
      new Promise<LaneState<RaceResult>>((resolve) => {
        finish = resolve
      }),
    )
    const onAnnounce = vi.fn()
    const { result, unmount } = renderHook(() =>
      useLabRun('race', parse, LANE, onAnnounce, run),
    )
    act(() => {
      result.current.start(REQUEST)
    })
    unmount()
    await act(async () => {
      finish({ status: 'live', result: RACE, runsLeft: 1 })
      await Promise.resolve()
    })
    expect(onAnnounce).toHaveBeenCalledTimes(1)
  })
})
