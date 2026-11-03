import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ui } from '@/content/ui'
import {
  FADE_IN_SECONDS,
  FADE_OUT_SECONDS,
  MUSIC_VOLUME,
  MusicToggle,
  TRACKS,
} from './MusicToggle'

interface FakeAudio {
  resume: ReturnType<typeof vi.fn<() => Promise<void>>>
  suspend: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  ramp: ReturnType<typeof vi.fn>
  play: ReturnType<typeof vi.fn<() => Promise<void>>>
  pause: ReturnType<typeof vi.fn<() => void>>
  elements: HTMLMediaElement[]
  contexts: number
}

function installFakeAudio(): FakeAudio {
  const fake: FakeAudio = {
    resume: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    ramp: vi.fn(),
    play: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    pause: vi.fn<() => void>(),
    elements: [],
    contexts: 0,
  }
  const analyserNode = {
    fftSize: 2048,
    smoothingTimeConstant: 0.8,
    frequencyBinCount: 512,
    context: { sampleRate: 48_000 },
    getFloatFrequencyData: vi.fn((data: Float32Array) => data.fill(-50)),
    connect: vi.fn(),
  }
  const gainNode = {
    gain: {
      value: 0,
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: fake.ramp,
    },
    connect: vi.fn().mockReturnValue(analyserNode),
  }
  class FakeAudioContext {
    currentTime = 10
    destination = {}
    resume = fake.resume
    suspend = fake.suspend
    close = fake.close
    createGain = () => gainNode
    createAnalyser = () => analyserNode
    createMediaElementSource = (element: HTMLMediaElement) => {
      fake.elements.push(element)
      return { connect: vi.fn().mockReturnValue(gainNode) }
    }
    constructor() {
      fake.contexts += 1
    }
  }
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => fake.play())
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {
    fake.pause()
  })
  return fake
}

function rejection(name: string) {
  return () => Promise.reject(new DOMException(name, name))
}

function pending() {
  let settle: () => void = () => undefined
  const promise = new Promise<void>((resolve) => {
    settle = resolve
  })
  return {
    promise,
    settle: () => {
      settle()
    },
  }
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
  })
}

async function renderToggle() {
  const result = render(<MusicToggle />)
  await flush()
  return result
}

function toggleButton() {
  return screen.getByRole('button', { name: ui.muteMusic })
}

function strip() {
  return document.querySelector('[data-state]')
}

function currentTrack(fake: FakeAudio) {
  return fake.elements.at(-1)?.getAttribute('src')
}

async function clickToggle() {
  fireEvent.click(toggleButton())
  await flush()
}

async function interact(type: 'click' | 'keydown' = 'click') {
  if (type === 'click') fireEvent.click(document.body)
  else fireEvent.keyDown(document.body, { key: 'a' })
  await flush()
}

async function fire(fake: FakeAudio, type: string) {
  fake.elements.at(-1)?.dispatchEvent(new Event(type))
  await flush()
}

async function fireTimes(fake: FakeAudio, type: string, times: number) {
  for (let i = 0; i < times; i++) await fire(fake, type)
}

async function setHidden(hidden: boolean) {
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(hidden)
  document.dispatchEvent(new Event('visibilitychange'))
  await flush()
}

function stubActivation(isActive: boolean) {
  Object.defineProperty(navigator, 'userActivation', {
    value: { isActive },
    configurable: true,
  })
}

describe('MusicToggle', () => {
  let reportError: ReturnType<typeof vi.fn<(error: unknown) => void>>

  beforeEach(() => {
    vi.useFakeTimers()
    reportError = vi.fn<(error: unknown) => void>()
    vi.stubGlobal('reportError', reportError)
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    Reflect.deleteProperty(navigator, 'userActivation')
    window.localStorage.clear()
  })

  it('plays the first track on load and fades to half volume when the browser allows it', async () => {
    const fake = installFakeAudio()
    await renderToggle()
    expect(fake.contexts).toBe(1)
    expect(currentTrack(fake)).toBe(TRACKS[0])
    expect(fake.elements[0]?.preload).toBe('none')
    expect(fake.play).toHaveBeenCalledTimes(1)
    expect(fake.resume).toHaveBeenCalledTimes(1)
    expect(fake.ramp).toHaveBeenCalledWith(MUSIC_VOLUME, 10 + FADE_IN_SECONDS)
    expect(MUSIC_VOLUME).toBe(0.5)
    expect(toggleButton()).toHaveAttribute('aria-pressed', 'false')
    expect(toggleButton()).not.toHaveAttribute('aria-busy')
    expect(strip()).toHaveAttribute('data-state', 'playing')
  })

  it('waits quietly for a click when the browser blocks autoplay', async () => {
    const fake = installFakeAudio()
    fake.play.mockImplementationOnce(rejection('NotAllowedError'))
    await renderToggle()
    expect(fake.ramp).not.toHaveBeenCalled()
    expect(reportError).not.toHaveBeenCalled()
    expect(strip()).toHaveAttribute('data-state', 'idle')
    await interact()
    expect(fake.contexts).toBe(1)
    expect(fake.play).toHaveBeenCalledTimes(2)
    expect(fake.ramp).toHaveBeenCalledWith(MUSIC_VOLUME, 10 + FADE_IN_SECONDS)
    expect(strip()).toHaveAttribute('data-state', 'playing')
    await interact()
    expect(fake.play).toHaveBeenCalledTimes(2)
  })

  it('starts on a keydown after a blocked load', async () => {
    const fake = installFakeAudio()
    fake.play.mockImplementationOnce(rejection('NotAllowedError'))
    await renderToggle()
    await interact('keydown')
    expect(fake.play).toHaveBeenCalledTimes(2)
    expect(fake.ramp).toHaveBeenCalledWith(MUSIC_VOLUME, 10 + FADE_IN_SECONDS)
  })

  it('does not start without user activation', async () => {
    const fake = installFakeAudio()
    fake.play.mockImplementationOnce(rejection('NotAllowedError'))
    stubActivation(false)
    await renderToggle()
    await interact()
    await interact('keydown')
    expect(fake.play).toHaveBeenCalledTimes(1)
    stubActivation(true)
    await interact()
    expect(fake.play).toHaveBeenCalledTimes(2)
  })

  it('mutes on a click of the button and stays quiet after', async () => {
    const fake = installFakeAudio()
    fake.play.mockImplementationOnce(rejection('NotAllowedError'))
    await renderToggle()
    await clickToggle()
    expect(toggleButton()).toHaveAttribute('aria-pressed', 'true')
    expect(window.localStorage.getItem('mccor-music')).toBe('muted')
    expect(strip()).toHaveAttribute('data-state', 'muted')
    await interact()
    expect(fake.play).toHaveBeenCalledTimes(1)
  })

  it('stays muted when the preference is stored, then unmutes and plays', async () => {
    const fake = installFakeAudio()
    window.localStorage.setItem('mccor-music', 'muted')
    await renderToggle()
    expect(toggleButton()).toHaveAttribute('aria-pressed', 'true')
    expect(fake.contexts).toBe(0)
    await interact()
    expect(fake.play).not.toHaveBeenCalled()
    await clickToggle()
    expect(toggleButton()).toHaveAttribute('aria-pressed', 'false')
    expect(window.localStorage.getItem('mccor-music')).toBeNull()
    expect(fake.contexts).toBe(1)
    expect(fake.play).toHaveBeenCalledTimes(1)
    expect(fake.ramp).toHaveBeenCalledWith(MUSIC_VOLUME, 10 + FADE_IN_SECONDS)
  })

  it('fades out, then pauses on mute, and resumes the same player on unmute', async () => {
    const fake = installFakeAudio()
    await renderToggle()
    await clickToggle()
    expect(toggleButton()).toHaveAttribute('aria-pressed', 'true')
    expect(fake.ramp).toHaveBeenLastCalledWith(0, 10 + FADE_OUT_SECONDS)
    expect(fake.pause).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(FADE_OUT_SECONDS * 1000)
    })
    expect(fake.pause).toHaveBeenCalledTimes(1)
    expect(fake.suspend).toHaveBeenCalledTimes(1)

    await clickToggle()
    expect(fake.contexts).toBe(1)
    expect(fake.play).toHaveBeenCalledTimes(2)
    expect(fake.resume).toHaveBeenCalledTimes(2)
    expect(fake.ramp).toHaveBeenLastCalledWith(MUSIC_VOLUME, 10 + FADE_IN_SECONDS)
    expect(toggleButton()).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps playing when unmuted during the fade-out', async () => {
    const fake = installFakeAudio()
    await renderToggle()
    await clickToggle()
    await clickToggle()
    act(() => {
      vi.advanceTimersByTime(FADE_OUT_SECONDS * 1000)
    })
    expect(fake.pause).not.toHaveBeenCalled()
    expect(fake.ramp).toHaveBeenLastCalledWith(MUSIC_VOLUME, 10 + FADE_IN_SECONDS)
  })

  it('never fades in when muted while play is pending', async () => {
    const fake = installFakeAudio()
    const play = pending()
    fake.play.mockImplementationOnce(() => play.promise)
    await renderToggle()
    expect(toggleButton()).toHaveAttribute('aria-busy', 'true')
    await clickToggle()
    play.settle()
    await flush()
    expect(fake.ramp).not.toHaveBeenCalledWith(MUSIC_VOLUME, expect.anything())
    expect(toggleButton()).not.toHaveAttribute('aria-busy')
    expect(strip()).toHaveAttribute('data-state', 'muted')
  })

  it('reports a play that fails for any other reason', async () => {
    const fake = installFakeAudio()
    fake.play.mockImplementationOnce(rejection('NotSupportedError'))
    await renderToggle()
    expect(reportError).toHaveBeenCalledTimes(1)
    const [reported] = reportError.mock.calls[0] ?? []
    expect(reported).toBeInstanceOf(Error)
    expect((reported as Error).cause).toBeInstanceOf(DOMException)
    expect(toggleButton()).toHaveAttribute('aria-pressed', 'false')
  })

  it('treats an interrupted play as expected', async () => {
    const fake = installFakeAudio()
    fake.play.mockImplementationOnce(rejection('AbortError'))
    await renderToggle()
    expect(reportError).not.toHaveBeenCalled()
  })

  it('plays every track back to back, then starts over with the first', async () => {
    const fake = installFakeAudio()
    await renderToggle()
    expect(currentTrack(fake)).toBe(TRACKS[0])
    for (const next of [...TRACKS.slice(1), TRACKS[0]]) {
      await fire(fake, 'ended')
      expect(currentTrack(fake)).toBe(next)
    }
    expect(new Set(TRACKS).size).toBe(TRACKS.length)
    expect(fake.play).toHaveBeenCalledTimes(TRACKS.length + 1)
    expect(fake.elements).toHaveLength(1)
  })

  it('skips a track that fails to load and stops once every track fails in a row', async () => {
    const fake = installFakeAudio()
    await renderToggle()
    await fire(fake, 'error')
    expect(reportError).toHaveBeenCalledTimes(1)
    expect((reportError.mock.calls[0]?.[0] as Error).message).toContain(TRACKS[0])
    expect(currentTrack(fake)).toBe(TRACKS[1])
    expect(fake.play).toHaveBeenCalledTimes(2)
    await fire(fake, 'playing')
    await fireTimes(fake, 'error', TRACKS.length)
    expect(reportError).toHaveBeenCalledTimes(TRACKS.length + 1)
    expect(fake.play).toHaveBeenCalledTimes(TRACKS.length + 1)
  })

  it('pauses while the tab is hidden and plays again when it is shown', async () => {
    const fake = installFakeAudio()
    await renderToggle()
    await setHidden(true)
    expect(fake.pause).toHaveBeenCalledTimes(1)
    expect(fake.suspend).toHaveBeenCalledTimes(1)
    await setHidden(false)
    expect(fake.play).toHaveBeenCalledTimes(2)
    expect(fake.resume).toHaveBeenCalledTimes(2)
  })

  it('waits for a hidden tab to be shown before playing on load', async () => {
    const fake = installFakeAudio()
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    await renderToggle()
    expect(fake.contexts).toBe(1)
    expect(fake.play).not.toHaveBeenCalled()
    await setHidden(false)
    expect(fake.play).toHaveBeenCalledTimes(1)
    expect(fake.ramp).toHaveBeenCalledWith(MUSIC_VOLUME, 10 + FADE_IN_SECONDS)
  })

  it('pauses and closes the audio context on unmount', async () => {
    const fake = installFakeAudio()
    const { unmount } = await renderToggle()
    unmount()
    expect(fake.pause).toHaveBeenCalledTimes(1)
    expect(fake.close).toHaveBeenCalledTimes(1)
  })

  it('ignores a play or resume that settles after unmount', async () => {
    const fake = installFakeAudio()
    const play = pending()
    fake.play.mockImplementationOnce(() => play.promise)
    fake.resume.mockImplementationOnce(rejection('InvalidStateError'))
    const { unmount } = render(<MusicToggle />)
    unmount()
    play.settle()
    await flush()
    expect(fake.ramp).not.toHaveBeenCalledWith(MUSIC_VOLUME, expect.anything())
    expect(reportError).not.toHaveBeenCalled()
  })

  it('stays idle without Web Audio', async () => {
    vi.stubGlobal('AudioContext', undefined)
    await renderToggle()
    await interact()
    expect(reportError).not.toHaveBeenCalled()
    expect(toggleButton()).toHaveAttribute('aria-pressed', 'false')
    expect(strip()).toHaveAttribute('data-state', 'idle')
  })

  it('draws a path-only icon with no text', () => {
    installFakeAudio()
    render(<MusicToggle />)
    const svg = toggleButton().querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg?.querySelector('text')).toBeNull()
    expect(svg?.textContent).toBe('')
    expect(svg?.querySelectorAll('path').length).toBeGreaterThan(0)
  })

  it('places the hidden equalizer strip right before the button', () => {
    installFakeAudio()
    render(<MusicToggle />)
    expect(strip()).toHaveAttribute('aria-hidden', 'true')
    expect(strip()?.nextElementSibling).toBe(toggleButton())
  })
})
