import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { labLive } from '@/content/lab/copy'
import type { LaneState } from '@/lib/lab'
import { useLabRun } from './useLabRun'

const parse = (value: unknown): number | null =>
  typeof value === 'number' ? value : null

const RECORDED_AT = '2026-10-09T14:30:00Z'
const RECORDED_TIME = 'Oct 9, 2026, 2:30 PM UTC'
const LANE = 'Race this step'

function setup(outcome: LaneState<number> | Promise<LaneState<number>>) {
  const run = vi.fn().mockReturnValue(Promise.resolve(outcome))
  const onAnnounce = vi.fn()
  const hook = renderHook(() => useLabRun('race', parse, LANE, onAnnounce, run))
  return { run, onAnnounce, hook }
}

async function runOnce(outcome: LaneState<number>) {
  const ctx = setup(outcome)
  act(() => {
    ctx.hook.result.current.start({ a: 1 })
  })
  await waitFor(() => {
    expect(ctx.hook.result.current.state.status).toBe(outcome.status)
  })
  return ctx
}

describe('useLabRun', () => {
  it('goes from idle to running to live and passes the request through', async () => {
    let finish: (state: LaneState<number>) => void = () => undefined
    const run = vi.fn().mockReturnValue(
      new Promise<LaneState<number>>((resolve) => {
        finish = resolve
      }),
    )
    const onAnnounce = vi.fn()
    const { result } = renderHook(() => useLabRun('race', parse, LANE, onAnnounce, run))
    expect(result.current.state).toEqual({ status: 'idle' })
    act(() => {
      result.current.start({ a: 1 })
    })
    expect(result.current.state).toEqual({ status: 'running' })
    expect(run).toHaveBeenCalledWith('race', { a: 1 }, parse)
    await act(async () => {
      finish({ status: 'live', result: 5, runsLeft: 2 })
      await Promise.resolve()
    })
    expect(result.current.state).toEqual({ status: 'live', result: 5, runsLeft: 2 })
  })

  it('ignores a second start while running', async () => {
    const { run, hook } = setup({ status: 'live', result: 1, runsLeft: 1 })
    act(() => {
      hook.result.current.start({ a: 1 })
      hook.result.current.start({ a: 2 })
    })
    await waitFor(() => {
      expect(hook.result.current.state.status).toBe('live')
    })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('runs again after a finish', async () => {
    const { run, hook } = setup({ status: 'live', result: 1, runsLeft: 1 })
    act(() => {
      hook.result.current.start({ a: 1 })
    })
    await waitFor(() => {
      expect(hook.result.current.state.status).toBe('live')
    })
    act(() => {
      hook.result.current.start({ a: 2 })
    })
    await waitFor(() => {
      expect(run).toHaveBeenCalledTimes(2)
    })
  })

  it('announces running then done for a live result', async () => {
    const { onAnnounce } = await runOnce({ status: 'live', result: 1, runsLeft: 1 })
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
      result: 1,
      runsLeft: 0,
    })
    expect(onAnnounce).toHaveBeenLastCalledWith(labLive.recordedCap(RECORDED_TIME))
  })

  it('announces the recording time for an off result', async () => {
    const { onAnnounce } = await runOnce({
      status: 'recorded',
      reason: 'off',
      recordedAt: RECORDED_AT,
      result: 1,
      runsLeft: null,
    })
    expect(onAnnounce).toHaveBeenLastCalledWith(labLive.recordedOff(RECORDED_TIME))
  })

  it('announces the recording time for a preview result', async () => {
    const { onAnnounce } = await runOnce({
      status: 'recorded',
      reason: 'preview',
      recordedAt: RECORDED_AT,
      result: 1,
      runsLeft: null,
    })
    expect(onAnnounce).toHaveBeenLastCalledWith(labLive.recordedPreview(RECORDED_TIME))
  })

  it('announces the blocked text', async () => {
    const { onAnnounce } = await runOnce({ status: 'blocked', stage: 'input' })
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
    const { result } = renderHook(() => useLabRun('argue', parse, LANE, onAnnounce, run))
    act(() => {
      result.current.start({})
    })
    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'error', reason: 'network' })
    })
    expect(onAnnounce).toHaveBeenCalledTimes(1)
  })

  it('does not announce or set state after unmount', async () => {
    let finish: (state: LaneState<number>) => void = () => undefined
    const run = vi.fn().mockReturnValue(
      new Promise<LaneState<number>>((resolve) => {
        finish = resolve
      }),
    )
    const onAnnounce = vi.fn()
    const { result, unmount } = renderHook(() =>
      useLabRun('race', parse, LANE, onAnnounce, run),
    )
    act(() => {
      result.current.start({})
    })
    unmount()
    await act(async () => {
      finish({ status: 'live', result: 1, runsLeft: 1 })
      await Promise.resolve()
    })
    expect(onAnnounce).toHaveBeenCalledTimes(1)
  })
})
