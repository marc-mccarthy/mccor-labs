import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@next/third-parties/google', () => ({
  GoogleAnalytics: ({ gaId }: { gaId: string }) => (
    <div data-testid="ga" data-ga-id={gaId} />
  ),
}))

const { Analytics, optedOut } = await import('./Analytics')

function setSignals(gpc: boolean | undefined, dnt: string | null) {
  Object.defineProperty(navigator, 'doNotTrack', { value: dnt, configurable: true })
  Object.defineProperty(navigator, 'globalPrivacyControl', {
    value: gpc,
    configurable: true,
  })
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'doNotTrack')
  Reflect.deleteProperty(navigator, 'globalPrivacyControl')
})

describe('optedOut', () => {
  it('treats Global Privacy Control as an opt-out', () => {
    expect(optedOut({ globalPrivacyControl: true, doNotTrack: null })).toBe(true)
  })

  it('treats Do Not Track as an opt-out', () => {
    expect(optedOut({ doNotTrack: '1' })).toBe(true)
  })

  it('allows analytics when neither signal is on', () => {
    expect(optedOut({ globalPrivacyControl: false, doNotTrack: '0' })).toBe(false)
    expect(optedOut({ doNotTrack: null })).toBe(false)
  })
})

describe('Analytics', () => {
  it('loads Google Analytics with the measurement ID when the visitor has not opted out', () => {
    setSignals(undefined, null)
    render(<Analytics gaId="G-ABC123XYZ9" />)
    expect(screen.getByTestId('ga')).toHaveAttribute('data-ga-id', 'G-ABC123XYZ9')
  })

  it('loads nothing when Global Privacy Control is on', () => {
    setSignals(true, null)
    render(<Analytics gaId="G-ABC123XYZ9" />)
    expect(screen.queryByTestId('ga')).toBeNull()
  })

  it('loads nothing when Do Not Track is on', () => {
    setSignals(undefined, '1')
    render(<Analytics gaId="G-ABC123XYZ9" />)
    expect(screen.queryByTestId('ga')).toBeNull()
  })
})
