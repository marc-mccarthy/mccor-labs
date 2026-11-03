import { describe, expect, it } from 'vitest'
import { opEnvError } from './require-op-env'

describe('opEnvError', () => {
  it('passes when op run defined the app.env settings', () => {
    expect(opEnvError({ DOMAIN_NAME: 'mccorlabs.com' })).toBeNull()
  })

  it('passes when the domain setting is defined but empty', () => {
    expect(opEnvError({ DOMAIN_NAME: '' })).toBeNull()
  })

  it('explains how to start the dev server when the settings are missing', () => {
    const error = opEnvError({})
    expect(error).toContain('pnpm dev')
    expect(error).toContain('pnpm -F web exec next dev')
  })
})
