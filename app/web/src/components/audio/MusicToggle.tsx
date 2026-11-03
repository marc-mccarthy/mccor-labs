'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createAnalyser, Equalizer } from './Equalizer'
import { ui } from '@/content/ui'

export const TRACKS = [
  '/media/audio/mccor-gardens-chill.mp3',
  '/media/audio/mccor-ambient-loop.mp3',
  '/media/audio/mccor-sci-fi-ambient.mp3',
  '/media/audio/mccor-last-point.mp3',
] as const
export const MUSIC_VOLUME = 0.5
export const FADE_IN_SECONDS = 1.2
export const FADE_OUT_SECONDS = 0.5

const MUSIC_STORAGE_KEY = 'mccor-music'
const MUTED = 'muted'

interface Player {
  context: AudioContext
  gain: GainNode
  analyser: AnalyserNode
  audio: HTMLAudioElement
  track: number
  failures: number
}

interface PlayerEvents {
  onPlaying: (player: Player) => void
  onGiveUp: (player: Player) => void
}

function hasWebAudio(): boolean {
  return typeof window.AudioContext === 'function'
}

function isExpected(error: unknown, name: string): boolean {
  return error instanceof DOMException && error.name === name
}

function isHandledByPlayer(error: unknown): boolean {
  return isExpected(error, 'AbortError') || isExpected(error, 'NotSupportedError')
}

function reportPlayFailure(error: unknown): void {
  if (isHandledByPlayer(error)) return
  reportError(new Error('Could not play the background music', { cause: error }))
}

function trackSrc(track: number): string {
  return TRACKS[track] ?? TRACKS[0]
}

function playTrack(player: Player, track: number): void {
  player.track = track % TRACKS.length
  player.audio.src = trackSrc(player.track)
  player.audio.play().catch(reportPlayFailure)
}

function reloadIfFailed(player: Player): void {
  if (player.audio.error) player.audio.src = trackSrc(player.track)
}

function onTrackError(player: Player, events: PlayerEvents): void {
  reportError(
    new Error(`Could not load ${player.audio.src}`, { cause: player.audio.error }),
  )
  player.failures += 1
  if (player.failures < TRACKS.length) playTrack(player, player.track + 1)
  else events.onGiveUp(player)
}

function createPlayer(events: PlayerEvents): Player {
  const audio = new Audio()
  audio.preload = 'none'
  audio.src = TRACKS[0]
  const context = new AudioContext()
  const gain = context.createGain()
  gain.gain.value = 0
  const analyser = createAnalyser(context)
  context
    .createMediaElementSource(audio)
    .connect(gain)
    .connect(analyser)
    .connect(context.destination)
  const player: Player = { context, gain, analyser, audio, track: 0, failures: 0 }
  audio.addEventListener('ended', () => {
    playTrack(player, player.track + 1)
  })
  audio.addEventListener('playing', () => {
    player.failures = 0
    events.onPlaying(player)
  })
  audio.addEventListener('error', () => {
    onTrackError(player, events)
  })
  return player
}

function rampGain({ context, gain }: Player, target: number, seconds: number): void {
  const now = context.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(gain.gain.value, now)
  gain.gain.linearRampToValueAtTime(target, now + seconds)
}

function pausePlayer({ audio, context }: Player): void {
  audio.pause()
  void context.suspend()
}

function noopUnsubscribe(): undefined {
  return undefined
}

function noopSubscribe(): () => undefined {
  return noopUnsubscribe
}

function serverSnapshot(): boolean {
  return false
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
  const storedMuted = useSyncExternalStore(noopSubscribe, readMuted, serverSnapshot)
  const [choice, setChoice] = useState<boolean | null>(null)
  const muted = choice ?? storedMuted
  const [loading, setLoading] = useState(false)
  const [live, setLive] = useState(false)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const playerRef = useRef<Player | null>(null)
  const wantedRef = useRef(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const fadeOutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fadeIn = useCallback((player: Player) => {
    if (playerRef.current !== player) return
    setLoading(false)
    if (!wantedRef.current) return
    rampGain(player, MUSIC_VOLUME, FADE_IN_SECONDS)
    setLive(true)
  }, [])

  const giveUp = useCallback((player: Player) => {
    if (playerRef.current === player) setLoading(false)
  }, [])

  const start = useCallback(async () => {
    if (!hasWebAudio()) return
    wantedRef.current = true
    const player =
      playerRef.current ?? createPlayer({ onPlaying: fadeIn, onGiveUp: giveUp })
    playerRef.current = player
    setAnalyser(player.analyser)
    if (fadeOutRef.current) {
      clearTimeout(fadeOutRef.current)
      fadeOutRef.current = null
    }
    if (document.hidden) return
    reloadIfFailed(player)
    setLoading(true)
    player.context.resume().catch((error: unknown) => {
      if (playerRef.current !== player) return
      reportError(new Error('Could not resume the background music', { cause: error }))
    })
    try {
      await player.audio.play()
      fadeIn(player)
    } catch (error) {
      if (playerRef.current !== player || isHandledByPlayer(error)) return
      setLoading(false)
      if (!isExpected(error, 'NotAllowedError')) reportPlayFailure(error)
    }
  }, [fadeIn, giveUp])

  const stop = useCallback(() => {
    wantedRef.current = false
    setLive(false)
    setLoading(false)
    const player = playerRef.current
    if (!player) return
    rampGain(player, 0, FADE_OUT_SECONDS)
    fadeOutRef.current = setTimeout(() => {
      fadeOutRef.current = null
      pausePlayer(player)
    }, FADE_OUT_SECONDS * 1000)
  }, [])

  const toggle = useCallback(() => {
    if (muted) {
      setChoice(false)
      writeMuted(false)
      void start()
    } else {
      setChoice(true)
      writeMuted(true)
      stop()
    }
  }, [muted, start, stop])

  useEffect(() => {
    if (!readMuted()) void start()
  }, [start])

  useEffect(() => {
    if (muted || live) return
    function onInteraction(event: Event) {
      if (buttonRef.current?.contains(event.target as Node)) return
      if ('userActivation' in navigator && !navigator.userActivation.isActive) return
      void start()
    }
    document.addEventListener('click', onInteraction)
    document.addEventListener('keydown', onInteraction)
    return () => {
      document.removeEventListener('click', onInteraction)
      document.removeEventListener('keydown', onInteraction)
    }
  }, [muted, live, start])

  useEffect(() => {
    function onVisibilityChange() {
      const player = playerRef.current
      if (!player || !wantedRef.current) return
      if (document.hidden) pausePlayer(player)
      else void start()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (fadeOutRef.current) clearTimeout(fadeOutRef.current)
      const player = playerRef.current
      if (player) {
        player.audio.pause()
        void player.context.close()
      }
      playerRef.current = null
    }
  }, [start])

  return (
    <>
      <Equalizer
        state={muted ? 'muted' : live ? 'playing' : 'idle'}
        analyser={analyser}
      />
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
            <path d="M10 6 H11.5 V10 H10 Z M12.5 4 H14 V12 H12.5 Z" />
          )}
        </svg>
      </button>
    </>
  )
}
