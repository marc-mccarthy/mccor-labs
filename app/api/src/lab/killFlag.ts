import { GetParameterCommand, type SSMClient } from '@aws-sdk/client-ssm'

import { KILL_FLAG } from '../config'
import { logEvent } from './logEvent'

interface KillFlagOptions {
  client: SSMClient
  name: string
  now: () => number
  cacheMs?: number
}

export function createKillFlag({
  client,
  name,
  now,
  cacheMs = KILL_FLAG.cacheMs,
}: KillFlagOptions) {
  let cached: { value: boolean; at: number } | null = null

  async function read(): Promise<boolean> {
    try {
      const out = await client.send(new GetParameterCommand({ Name: name }))
      return out.Parameter?.Value === 'true'
    } catch (error) {
      logEvent({
        event: 'kill_flag_error',
        error: error instanceof Error ? error.name : 'unknown',
      })
      return false
    }
  }

  return async function isLive(): Promise<boolean> {
    const at = now()
    if (cached !== null && at - cached.at < cacheMs) return cached.value
    const value = await read()
    cached = { value, at }
    return value
  }
}
