'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMotionPausedFlag } from '@/components/motion/MotionPauseProvider'
import { useReducedMotion } from '@/components/motion/useReducedMotion'
import { ui } from '@/content/ui'

export const MUSIC_SRC = '/media/audio/mccor-ambient-loop.mp3'
export const MUSIC_VOLUME = 0.5
export const FADE_IN_SECONDS = 1.2
export const FADE_OUT_SECONDS = 0.5
export const BAR_MIN = 2
export const BAR_MAX = 12
export const BARS = [
  { x: 9.5, rest: 4, bins: [1, 3] },
  { x: 11.75, rest: 8, bins: [3, 7] },
  { x: 14, rest: 6, bins: [7, 15] },
] as const

const LOOP_TRIM_SECONDS = 0.05
const MUSIC_STORAGE_KEY = 'mccor-music'
const MUTED = 'muted'
const ANALYSER_FFT_SIZE = 64
const BAR_WIDTH = 1.5
const BAR_CENTER = 8

interface Player {
  context: AudioContext
  gain: GainNode
  analyser: AnalyserNode
}

function setBar(bar: SVGRectElement | null, height: number): void {
  bar?.setAttribute('height', String(height))
  bar?.setAttribute('y', String(BAR_CENTER - height / 2))
}

function barHeight(data: Uint8Array, [from, to]: readonly [number, number]): number {
  let sum = 0
  for (let i = from; i < to; i++) sum += data[i] ?? 0
  return BAR_MIN + (sum / (to - from) / 255) * (BAR_MAX - BAR_MIN)
}

async function createPlayer(): Promise<Player> {
  const context = new AudioContext()
  void context.resume()
  try {
    const response = await fetch(MUSIC_SRC)
    if (!response.ok) {
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
    const analyser = context.createAnalyser()
    analyser.fftSize = ANALYSER_FFT_SIZE
    source.connect(gain).connect(analyser).connect(context.destination)
    source.start()
    return { context, gain, analyser }
  } catch (error) {
    await context.close()
    throw error
  }
}

function rampGain({ context, gain }: Player, target: number, seconds: number): void {
  const now = context.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(gain.gain.value, now)
  gain.gain.linearRampToValueAtTime(target, now + seconds)
}

function isMusicWanted(ref: { current: boolean }): boolean {
  return ref.current
}

function reportStorageFailure(action: string, cause: unknown): void {
  reportError(new Error(`Could not ${action} the music mute preference`, { cause }))
}

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUSIC_STORAGE_KEY) === MUTED
  } catch (error) {
    reportStorageFailure('read', error)
    return false
  }
}

function writeMuted(muted: boolean): void {
  try {
    if (muted) {
      window.localStorage.setItem(MUSIC_STORAGE_KEY, MUTED)
    } else {
      window.localStorage.removeItem(MUSIC_STORAGE_KEY)
    }
  } catch (error) {
    reportStorageFailure('save', error)
  }
}

export function MusicToggle() {
  const [muted, setMuted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [live, setLive] = useState(false)
  const reducedMotion = useReducedMotion()
  const motionPaused = useMotionPausedFlag()
  const barsRef = useRef<(SVGRectElement | null)[]>([])
  const playerRef = useRef<Player | null>(null)
  const pendingRef = useRef(false)
  const mountedRef = useRef(true)
  const wantedRef = useRef(false)
  const startedRef = useRef(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const fadeOutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = useCallback(async () => {
    wantedRef.current = true
    startedRef.current = true
    if (pendingRef.current) return
    pendingRef.current = true
    setLoading(true)
    try {
      const player = playerRef.current ?? (await createPlayer())
      if (!mountedRef.current) {
        await player.context.close()
        return
      }
      playerRef.current = player
      setLive(true)
      if (fadeOutRef.current) {
        clearTimeout(fadeOutRef.current)
        fadeOutRef.current = null
      }
      if (isMusicWanted(wantedRef)) {
        rampGain(player, MUSIC_VOLUME, FADE_IN_SECONDS)
        await (document.hidden ? player.context.suspend() : player.context.resume())
      } else {
        await player.context.suspend()
      }
    } catch (error) {
      if (!mountedRef.current) return
      reportError(new Error('Could not start the background music', { cause: error }))
    } finally {
      pendingRef.current = false
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  const stop = useCallback(() => {
    wantedRef.current = false
    const player = playerRef.current
    if (!player) return
    rampGain(player, 0, FADE_OUT_SECONDS)
    fadeOutRef.current = setTimeout(() => {
      fadeOutRef.current = null
      void player.context.suspend()
    }, FADE_OUT_SECONDS * 1000)
  }, [])

  const toggle = useCallback(() => {
    if (muted) {
      setMuted(false)
      writeMuted(false)
      void start()
    } else {
      setMuted(true)
      writeMuted(true)
      stop()
    }
  }, [muted, start, stop])

  useEffect(() => {
    if (readMuted()) setMuted(true)
  }, [])

  useEffect(() => {
    if (muted || startedRef.current) return
    function onInteraction(event: Event) {
      if (buttonRef.current?.contains(event.target as Node)) return
      if ('userActivation' in navigator && !navigator.userActivation.isActive) return
      document.removeEventListener('click', onInteraction)
      document.removeEventListener('keydown', onInteraction)
      void start()
    }
    document.addEventListener('click', onInteraction)
    document.addEventListener('keydown', onInteraction)
    return () => {
      document.removeEventListener('click', onInteraction)
      document.removeEventListener('keydown', onInteraction)
    }
  }, [muted, start])

  useEffect(() => {
    const analyser = playerRef.current?.analyser
    const bars = barsRef.current
    if (!live || muted || reducedMotion || motionPaused || !analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    let frame = requestAnimationFrame(function draw() {
      analyser.getByteFrequencyData(data)
      BARS.forEach(({ bins }, i) => {
        setBar(bars[i] ?? null, barHeight(data, bins))
      })
      frame = requestAnimationFrame(draw)
    })
    return () => {
      cancelAnimationFrame(frame)
      BARS.forEach(({ rest }, i) => {
        setBar(bars[i] ?? null, rest)
      })
    }
  }, [live, muted, reducedMotion, motionPaused])

  useEffect(() => {
    mountedRef.current = true
    function onVisibilityChange() {
      const player = playerRef.current
      if (!player || !wantedRef.current) return
      void (document.hidden ? player.context.suspend() : player.context.resume())
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      mountedRef.current = false
      if (fadeOutRef.current) clearTimeout(fadeOutRef.current)
      void playerRef.current?.context.close()
      playerRef.current = null
    }
  }, [])

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-pressed={muted}
      aria-busy={loading ? true : undefined}
      aria-label={ui.muteMusic}
      onClick={toggle}
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
        {muted ? (
          <path d="M10.3 5.3 L11 4.6 L15.4 9 L14.7 9.7 Z M14.7 4.6 L15.4 5.3 L11 9.7 L10.3 9 Z" />
        ) : (
          BARS.map(({ x, rest }, i) => (
            <rect
              key={x}
              ref={(bar) => {
                barsRef.current[i] = bar
              }}
              x={x}
              y={BAR_CENTER - rest / 2}
              width={BAR_WIDTH}
              height={rest}
            />
          ))
        )}
      </svg>
    </button>
  )
}
