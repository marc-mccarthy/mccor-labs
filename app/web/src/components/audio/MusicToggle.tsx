'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ui } from '@/content/ui'

export const MUSIC_SRC = '/media/audio/ambient-loop.mp3'
export const FADE_IN_SECONDS = 1.2
export const FADE_OUT_SECONDS = 0.5

const LOOP_TRIM_SECONDS = 0.05

interface Player {
  context: AudioContext
  gain: GainNode
}

async function createPlayer(): Promise<Player> {
  const context = new AudioContext()
  const response = await fetch(MUSIC_SRC)
  if (!response.ok) {
    await context.close()
    throw new Error(`Could not load ${MUSIC_SRC}: ${String(response.status)}`)
  }
  const buffer = await context.decodeAudioData(await response.arrayBuffer())
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  source.loopStart = LOOP_TRIM_SECONDS
  source.loopEnd = buffer.duration - LOOP_TRIM_SECONDS
  const gain = context.createGain()
  gain.gain.value = 0
  source.connect(gain).connect(context.destination)
  source.start()
  return { context, gain }
}

function rampGain({ context, gain }: Player, target: number, seconds: number): void {
  const now = context.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(gain.gain.value, now)
  gain.gain.linearRampToValueAtTime(target, now + seconds)
}

export function MusicToggle() {
  const [playing, setPlaying] = useState(false)
  const playerRef = useRef<Player | null>(null)
  const pendingRef = useRef(false)
  const fadeOutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = useCallback(async () => {
    if (pendingRef.current) return
    pendingRef.current = true
    try {
      playerRef.current ??= await createPlayer()
      const player = playerRef.current
      if (fadeOutRef.current) {
        clearTimeout(fadeOutRef.current)
        fadeOutRef.current = null
      }
      await player.context.resume()
      rampGain(player, 1, FADE_IN_SECONDS)
      setPlaying(true)
    } catch (error) {
      reportError(new Error('Could not start the background music', { cause: error }))
      setPlaying(false)
    } finally {
      pendingRef.current = false
    }
  }, [])

  const stop = useCallback(() => {
    const player = playerRef.current
    if (!player) return
    rampGain(player, 0, FADE_OUT_SECONDS)
    fadeOutRef.current = setTimeout(() => {
      fadeOutRef.current = null
      void player.context.suspend()
    }, FADE_OUT_SECONDS * 1000)
    setPlaying(false)
  }, [])

  useEffect(() => {
    if (!playing) return
    function onVisibilityChange() {
      const player = playerRef.current
      if (!player) return
      void (document.hidden ? player.context.suspend() : player.context.resume())
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [playing])

  useEffect(
    () => () => {
      if (fadeOutRef.current) clearTimeout(fadeOutRef.current)
      void playerRef.current?.context.close()
    },
    [],
  )

  return (
    <button
      type="button"
      aria-pressed={playing}
      aria-label={ui.playMusic}
      onClick={playing ? stop : () => void start()}
      className="inline-flex h-11 w-11 shrink-0 press items-center justify-center rounded-full border border-border text-muted hover:text-accent focus-visible:text-accent aria-pressed:border-accent"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M1 5.5 H4 L8 2.5 V13.5 L4 10.5 H1 Z" />
        {playing ? (
          <path d="M10 6 H11.5 V10 H10 Z M12.5 4 H14 V12 H12.5 Z" />
        ) : (
          <path d="M10.3 5.3 L11 4.6 L15.4 9 L14.7 9.7 Z M14.7 4.6 L15.4 5.3 L11 9.7 L10.3 9 Z" />
        )}
      </svg>
    </button>
  )
}
