import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
import { mockClient } from 'aws-sdk-client-mock'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createKillFlag } from './killFlag'

const ssm = mockClient(SSMClient)
const client = new SSMClient({ region: 'us-east-1' })
const NAME = '/mccorlabs/labs/should-this-be-ai/enabled'

let clock = 0
const now = () => clock

function flag() {
  return createKillFlag({ client, name: NAME, now })
}

beforeEach(() => {
  ssm.reset()
  clock = 1_000_000
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createKillFlag', () => {
  it('returns true only for the exact value true', async () => {
    ssm.on(GetParameterCommand).resolves({ Parameter: { Value: 'true' } })
    expect(await flag()()).toBe(true)
  })

  it.each(['false', 'TRUE', 'yes'])('returns false for %s', async (value) => {
    ssm.on(GetParameterCommand).resolves({ Parameter: { Value: value } })
    expect(await flag()()).toBe(false)
  })

  it('returns false when the parameter has no value', async () => {
    ssm.on(GetParameterCommand).resolves({})
    expect(await flag()()).toBe(false)
  })

  it('requests the configured parameter name', async () => {
    ssm.on(GetParameterCommand).resolves({ Parameter: { Value: 'true' } })
    await flag()()
    expect(ssm.commandCalls(GetParameterCommand)[0]?.args[0].input).toEqual({
      Name: NAME,
    })
  })

  it('reads once inside the cache window and again at 60,000 ms', async () => {
    ssm.on(GetParameterCommand).resolves({ Parameter: { Value: 'true' } })
    const isLive = flag()
    await isLive()
    clock += 59_999
    await isLive()
    expect(ssm.commandCalls(GetParameterCommand)).toHaveLength(1)
    clock += 1
    await isLive()
    expect(ssm.commandCalls(GetParameterCommand)).toHaveLength(2)
  })

  it('fails closed on an SSM error, logs one line and caches the failure', async () => {
    const error = Object.assign(new Error('missing'), { name: 'ParameterNotFound' })
    ssm.on(GetParameterCommand).rejects(error)
    const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    const isLive = flag()
    expect(await isLive()).toBe(false)
    expect(write).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(write.mock.calls[0]?.[0]))).toEqual({
      event: 'kill_flag_error',
      error: 'ParameterNotFound',
    })
    clock += 30_000
    expect(await isLive()).toBe(false)
    expect(ssm.commandCalls(GetParameterCommand)).toHaveLength(1)
  })
})
