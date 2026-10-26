'use client'

import { GoogleAnalytics } from '@next/third-parties/google'
import { useSyncExternalStore } from 'react'

interface PrivacySignals {
  globalPrivacyControl?: boolean
  doNotTrack?: string | null
}

export function optedOut(signals: PrivacySignals): boolean {
  return signals.globalPrivacyControl === true || signals.doNotTrack === '1'
}

const subscribe = () => () => undefined

export function Analytics({ gaId }: { gaId: string }) {
  const allowed = useSyncExternalStore(
    subscribe,
    () => !optedOut(navigator as Navigator & PrivacySignals),
    () => false,
  )
  return allowed ? <GoogleAnalytics gaId={gaId} /> : null
}
