import { describe, expect, it } from 'vitest'
import { assertNoClaims } from '@/test/noClaims'
import { ui } from './ui'

describe('contact strings make no claims', () => {
  it.each([
    ['formErrorTooFast', ui.formErrorTooFast],
    ['formErrorDailyCap', ui.formErrorDailyCap],
    ['formErrorServer', ui.formErrorServer],
    ['formSuccess', ui.formSuccess],
  ])('%s passes the banned-claims check', (_key, text) => {
    expect(text.length).toBeGreaterThan(0)
    assertNoClaims(text)
  })
})
