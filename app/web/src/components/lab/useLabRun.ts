'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { labLive } from '@/content/lab/copy'
import { postLab, type LabKind, type LaneState } from '@/lib/lab'

const TIME_FORMAT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

function formatRecordedAt(recordedAt: string): string {
  const date = new Date(recordedAt)
  return Number.isNaN(date.getTime()) ? recordedAt : `${TIME_FORMAT.format(date)} UTC`
}

function finishText<R>(state: LaneState<R>, laneName: string): string | null {
  switch (state.status) {
    case 'live':
      return labLive.announceDone(laneName)
    case 'recorded': {
      const time = formatRecordedAt(state.recordedAt)
      if (state.reason === 'cap') return labLive.recordedCap(time)
      if (state.reason === 'off') return labLive.recordedOff(time)
      return labLive.recordedPreview(time)
    }
    case 'blocked':
      return labLive.blocked
    default:
      return null
  }
}

export function useLabRun<R>(
  kind: LabKind,
  parse: (v: unknown) => R | null,
  laneName: string,
  onAnnounce: (text: string) => void,
  run: typeof postLab = postLab,
): { state: LaneState<R>; start: (body: unknown) => void } {
  const [state, setState] = useState<LaneState<R>>({ status: 'idle' })
  const running = useRef(false)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const start = useCallback(
    (body: unknown) => {
      if (running.current) return
      running.current = true
      setState({ status: 'running' })
      onAnnounce(labLive.announceRunning(laneName))
      const settle = async () => {
        let next: LaneState<R>
        try {
          next = await run(kind, body, parse)
        } catch {
          next = { status: 'error', reason: 'network' }
        }
        running.current = false
        if (!mounted.current) return
        setState(next)
        const text = finishText(next, laneName)
        if (text !== null) onAnnounce(text)
      }
      void settle()
    },
    [kind, parse, laneName, onAnnounce, run],
  )

  return { state, start }
}
