import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  parseArgueResult,
  parseRaceResult,
  postLab,
  toLaneState,
  type ArgueResult,
  type RaceResult,
} from './lab'

const race: RaceResult = {
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

const argue: ArgueResult = {
  kind: 'argue',
  modelLabel: 'Nova 2 Lite',
  pricesAsOf: '2026-10-09',
  text: 'A person reads the mail better.',
  ms: 900,
  inputTokens: 600,
  outputTokens: 400,
  guardrailUnits: 6,
  costUsd: 0.0023,
}

const parseNumber = (value: unknown): number | null =>
  typeof value === 'number' ? value : null

function reply(status: number, body: unknown): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('parseRaceResult', () => {
  it('accepts a full race result', () => {
    expect(parseRaceResult(race)).toEqual(race)
  })

  it.each([
    ['null', null],
    ['an array', []],
    ['the wrong kind', { ...race, kind: 'argue' }],
    ['a missing model lane', { ...race, model: undefined }],
    ['a string for tokens', { ...race, model: { ...race.model, inputTokens: '1' } }],
    ['a negative cost', { ...race, program: { ...race.program, costUsd: -1 } }],
    ['correct above total', { ...race, program: { ...race.program, correct: 3 } }],
    ['non-string answers', { ...race, program: { ...race.program, answers: [1] } }],
  ])('rejects %s', (_name, value) => {
    expect(parseRaceResult(value)).toBeNull()
  })
})

describe('parseArgueResult', () => {
  it('accepts a full argue result', () => {
    expect(parseArgueResult(argue)).toEqual(argue)
  })

  it.each([
    ['null', null],
    ['the wrong kind', { ...argue, kind: 'race' }],
    ['a missing text', { ...argue, text: undefined }],
    ['fractional tokens', { ...argue, inputTokens: 1.5 }],
    ['an infinite cost', { ...argue, costUsd: Infinity }],
  ])('rejects %s', (_name, value) => {
    expect(parseArgueResult(value)).toBeNull()
  })
})

describe('toLaneState', () => {
  it('maps a live 200', () => {
    expect(
      toLaneState(200, { mode: 'live', result: race, runsLeft: 7 }, parseRaceResult),
    ).toEqual({ status: 'live', result: race, runsLeft: 7 })
  })

  it.each(['cap', 'off'] as const)('maps a recorded 200 with reason %s', (reason) => {
    expect(
      toLaneState(
        200,
        {
          mode: 'recorded',
          reason,
          recordedAt: '2026-10-09T10:00:00Z',
          result: race,
          runsLeft: null,
        },
        parseRaceResult,
      ),
    ).toEqual({
      status: 'recorded',
      reason,
      recordedAt: '2026-10-09T10:00:00Z',
      result: race,
      runsLeft: null,
    })
  })

  it.each(['input', 'output'] as const)('maps a blocked 200 at %s', (stage) => {
    expect(
      toLaneState(200, { mode: 'blocked', stage, runsLeft: 3 }, parseRaceResult),
    ).toEqual({ status: 'blocked', stage })
  })

  it('maps 400 to validation', () => {
    expect(toLaneState(400, { reason: 'bad' }, parseRaceResult)).toEqual({
      status: 'error',
      reason: 'validation',
    })
  })

  it.each([429, 500, 502, 503])('maps %i to server', (status) => {
    expect(toLaneState(status, { reason: 'x' }, parseRaceResult)).toEqual({
      status: 'error',
      reason: 'server',
    })
  })

  it.each([
    ['null', null],
    ['an unknown mode', { mode: 'other' }],
    [
      'a result that fails to parse',
      { mode: 'live', result: { kind: 'race' }, runsLeft: 1 },
    ],
    ['a live body without runsLeft', { mode: 'live', result: race }],
    [
      'a recorded body with an unknown reason',
      { mode: 'recorded', reason: 'x', recordedAt: 'a', result: race, runsLeft: null },
    ],
    ['a blocked body with an unknown stage', { mode: 'blocked', stage: 'x' }],
  ])('maps a 200 with %s to server', (_name, body) => {
    expect(toLaneState(200, body, parseRaceResult)).toEqual({
      status: 'error',
      reason: 'server',
    })
  })
})

describe('postLab', () => {
  it.each([
    ['race', '/api/lab/race'],
    ['argue', '/api/lab/argue'],
  ] as const)('posts %s to %s through the injected post', async (kind, endpoint) => {
    const post = vi
      .fn()
      .mockResolvedValue(reply(200, { mode: 'live', result: 5, runsLeft: 2 }))
    const state = await postLab(kind, { a: 1 }, parseNumber, { post })
    expect(post).toHaveBeenCalledWith(endpoint, { a: 1 })
    expect(state).toEqual({ status: 'live', result: 5, runsLeft: 2 })
  })

  it('maps a rejected post to network', async () => {
    const post = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await postLab('race', {}, parseNumber, { post })).toEqual({
      status: 'error',
      reason: 'network',
    })
  })

  it('maps an unreadable body on a 200 to server', async () => {
    const post = vi.fn().mockResolvedValue(reply(200, 'not json'))
    expect(await postLab('race', {}, parseNumber, { post })).toEqual({
      status: 'error',
      reason: 'server',
    })
  })

  it('times out after 20,000 ms and not before', async () => {
    vi.useFakeTimers()
    const post = vi.fn().mockReturnValue(new Promise<Response>(() => undefined))
    const settled = vi.fn()
    const pending = postLab('race', {}, parseNumber, { post }).then(settled)
    await vi.advanceTimersByTimeAsync(19_999)
    expect(settled).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await pending
    expect(settled).toHaveBeenCalledWith({ status: 'error', reason: 'timeout' })
  })

  it('clears its timer once the post settles', async () => {
    vi.useFakeTimers()
    const post = vi
      .fn()
      .mockResolvedValue(reply(200, { mode: 'live', result: 1, runsLeft: 0 }))
    await postLab('race', {}, parseNumber, { post })
    expect(vi.getTimerCount()).toBe(0)
  })
})
