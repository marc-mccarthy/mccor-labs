import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ui } from '@/content/ui'
import {
  BAR_MAX,
  BARS,
  FADE_IN_SECONDS,
  FADE_OUT_SECONDS,
  MUSIC_SRC,
  MUSIC_VOLUME,
  MusicToggle,
} from './MusicToggle'

interface FakeAudio {
  resume: ReturnType<typeof vi.fn>
  suspend: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  ramp: ReturnType<typeof vi.fn>
  decode: ReturnType<typeof vi.fn>
  source: { loop: boolean; loopStart: number; loopEnd: number; buffer: unknown }
  spectrum: ReturnType<typeof vi.fn>
}

function installFakeAudioContext(): FakeAudio {
  const fake: FakeAudio = {
    resume: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    start: vi.fn(),
    ramp: vi.fn(),
    decode: vi.fn().mockResolvedValue({ duration: 124 }),
    source: { loop: false, loopStart: 0, loopEnd: 0, buffer: null },
    spectrum: vi.fn((data: Uint8Array) => data.fill(255)),
  }
  const analyserNode = {
    fftSize: 2048,
    frequencyBinCount: 32,
    getByteFrequencyData: fake.spectrum,
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
    decodeAudioData = fake.decode
    createGain = () => gainNode
    createAnalyser = () => analyserNode
    createBufferSource = () => {
      const source = Object.assign(fake.source, {
        start: fake.start,
        connect: vi.fn().mockReturnValue(gainNode),
      })
      return source
    }
  }
  vi.stubGlobal('AudioContext', FakeAudioContext)
  return fake
}

function mockFetch(ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 404,
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function clickToggle(toggle: HTMLElement) {
  await act(async () => {
    fireEvent.click(toggle)
    await Promise.resolve()
  })
}

async function interact(type: 'click' | 'keydown' = 'click') {
  await act(async () => {
    if (type === 'click') fireEvent.click(document.body)
    else fireEvent.keyDown(document.body, { key: 'a' })
    await Promise.resolve()
  })
}

function stubActivation(isActive: boolean) {
  Object.defineProperty(navigator, 'userActivation', {
    value: { isActive },
    configurable: true,
  })
}

function resolvedResponse() {
  return {
    ok: true,
    status: 200,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  }
}

describe('MusicToggle', () => {
  let reportError: ReturnType<typeof vi.fn<(error: unknown) => void>>

  beforeEach(() => {
    vi.useFakeTimers()
    reportError = vi.fn<(error: unknown) => void>()
    vi.stubGlobal('reportError', reportError)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    Reflect.deleteProperty(navigator, 'userActivation')
    window.localStorage.clear()
  })

  it('renders unmuted and fetches nothing before an interaction', () => {
    const fetchMock = mockFetch()
    installFakeAudioContext()
    render(<MusicToggle />)
    const toggle = screen.getByRole('button', { name: ui.muteMusic })
    expect(toggle).toHaveAttribute('type', 'button')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loads the loop, starts it, and fades to half volume on a click elsewhere', async () => {
    const fetchMock = mockFetch()
    const fake = installFakeAudioContext()
    render(<MusicToggle />)
    const toggle = screen.getByRole('button', { name: ui.muteMusic })
    await interact()
    expect(fetchMock).toHaveBeenCalledWith(MUSIC_SRC)
    expect(fake.source.loop).toBe(true)
    expect(fake.source.loopStart).toBeGreaterThan(0)
    expect(fake.source.loopEnd).toBeLessThan(124)
    expect(fake.start).toHaveBeenCalledTimes(1)
    expect(fake.resume).toHaveBeenCalledTimes(2)
    expect(fake.ramp).toHaveBeenCalledWith(MUSIC_VOLUME, 10 + FADE_IN_SECONDS)
    expect(MUSIC_VOLUME).toBe(0.5)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(toggle).not.toHaveAttribute('aria-busy')
    await interact()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('starts on a keydown', async () => {
    const fetchMock = mockFetch()
    const fake = installFakeAudioContext()
    render(<MusicToggle />)
    await interact('keydown')
    expect(fetchMock).toHaveBeenCalledWith(MUSIC_SRC)
    expect(fake.ramp).toHaveBeenCalledWith(MUSIC_VOLUME, 10 + FADE_IN_SECONDS)
  })

  it('does not start without user activation', async () => {
    const fetchMock = mockFetch()
    installFakeAudioContext()
    stubActivation(false)
    render(<MusicToggle />)
    await interact()
    await interact('keydown')
    expect(fetchMock).not.toHaveBeenCalled()
    stubActivation(true)
    await interact()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('mutes on the first click of the button without loading anything', async () => {
    const fetchMock = mockFetch()
    installFakeAudioContext()
    render(<MusicToggle />)
    const toggle = screen.getByRole('button', { name: ui.muteMusic })
    await clickToggle(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(window.localStorage.getItem('mccor-music')).toBe('muted')
    await interact()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('stays muted when the preference is stored, then unmutes and plays', async () => {
    const fetchMock = mockFetch()
    const fake = installFakeAudioContext()
    window.localStorage.setItem('mccor-music', 'muted')
    render(<MusicToggle />)
    const toggle = screen.getByRole('button', { name: ui.muteMusic })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await interact()
    expect(fetchMock).not.toHaveBeenCalled()
    await clickToggle(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(window.localStorage.getItem('mccor-music')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fake.ramp).toHaveBeenCalledWith(MUSIC_VOLUME, 10 + FADE_IN_SECONDS)
  })

  it('fades out and suspends on mute, then resumes on unmute without reloading', async () => {
    const fetchMock = mockFetch()
    const fake = installFakeAudioContext()
    render(<MusicToggle />)
    const toggle = screen.getByRole('button', { name: ui.muteMusic })
    await interact()
    await clickToggle(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(fake.ramp).toHaveBeenLastCalledWith(0, 10 + FADE_OUT_SECONDS)
    expect(fake.suspend).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(FADE_OUT_SECONDS * 1000)
    })
    expect(fake.suspend).toHaveBeenCalledTimes(1)

    await clickToggle(toggle)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fake.start).toHaveBeenCalledTimes(1)
    expect(fake.resume).toHaveBeenCalledTimes(3)
    expect(fake.ramp).toHaveBeenLastCalledWith(MUSIC_VOLUME, 10 + FADE_IN_SECONDS)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  it('never fades in when muted during a pending load', async () => {
    const fake = installFakeAudioContext()
    let resolveFetch: (value: unknown) => void = () => undefined
    const fetchMock = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<MusicToggle />)
    const toggle = screen.getByRole('button', { name: ui.muteMusic })
    await interact()
    expect(toggle).toHaveAttribute('aria-busy', 'true')
    await clickToggle(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await act(async () => {
      resolveFetch(resolvedResponse())
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fake.ramp).not.toHaveBeenCalledWith(MUSIC_VOLUME, expect.anything())
    expect(fake.suspend).toHaveBeenCalledTimes(1)
    expect(toggle).not.toHaveAttribute('aria-busy')
  })

  it('reports a failed load and closes the context', async () => {
    mockFetch(false)
    const fake = installFakeAudioContext()
    render(<MusicToggle />)
    const toggle = screen.getByRole('button', { name: ui.muteMusic })
    await interact()
    expect(reportError).toHaveBeenCalledTimes(1)
    const [reported] = reportError.mock.calls[0] ?? []
    expect(reported).toBeInstanceOf(Error)
    expect((reported as Error).cause).toBeInstanceOf(Error)
    expect(fake.close).toHaveBeenCalledTimes(1)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  it('suspends while the tab is hidden and resumes when it is shown', async () => {
    mockFetch()
    const fake = installFakeAudioContext()
    render(<MusicToggle />)
    await interact()
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(fake.suspend).toHaveBeenCalledTimes(1)
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(fake.resume).toHaveBeenCalledTimes(3)
  })

  it('closes the audio context on unmount', async () => {
    mockFetch()
    const fake = installFakeAudioContext()
    const { unmount } = render(<MusicToggle />)
    await interact()
    unmount()
    expect(fake.close).toHaveBeenCalledTimes(1)
  })

  it('closes the context when fetch rejects or decoding fails', async () => {
    const fake = installFakeAudioContext()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    const { unmount } = render(<MusicToggle />)
    await interact()
    expect(fake.close).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: ui.muteMusic })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    unmount()

    mockFetch()
    fake.decode.mockRejectedValue(new DOMException('bad', 'EncodingError'))
    render(<MusicToggle />)
    await interact()
    expect(fake.close).toHaveBeenCalledTimes(2)
    expect(reportError).toHaveBeenCalledTimes(2)
  })

  it('closes a load that finishes after unmount and never fades in', async () => {
    const fake = installFakeAudioContext()
    let resolveFetch: (value: unknown) => void = () => undefined
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
      ),
    )
    const { unmount } = render(<MusicToggle />)
    await interact()
    unmount()
    await act(async () => {
      resolveFetch(resolvedResponse())
      await Promise.resolve()
    })
    expect(fake.close).toHaveBeenCalledTimes(1)
    expect(fake.ramp).not.toHaveBeenCalledWith(MUSIC_VOLUME, expect.anything())
  })

  it('keeps the loop suspended when the tab is hidden by the time the load finishes', async () => {
    mockFetch()
    const fake = installFakeAudioContext()
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    render(<MusicToggle />)
    await interact()
    expect(fake.suspend).toHaveBeenCalledTimes(1)
    expect(fake.resume).toHaveBeenCalledTimes(1)
    expect(fake.ramp).toHaveBeenCalledWith(MUSIC_VOLUME, 10 + FADE_IN_SECONDS)
  })

  it('draws a path-only icon with no text', () => {
    mockFetch()
    installFakeAudioContext()
    render(<MusicToggle />)
    const svg = screen.getByRole('button', { name: ui.muteMusic }).querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg?.querySelector('text')).toBeNull()
    expect(svg?.textContent).toBe('')
    expect(svg?.querySelectorAll('path').length).toBeGreaterThan(0)
  })

  function barHeights() {
    return [
      ...screen.getByRole('button', { name: ui.muteMusic }).querySelectorAll('rect'),
    ].map((bar) => Number(bar.getAttribute('height')))
  }

  function captureFrames() {
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback)
      return frames.length
    })
    const cancel = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined)
    return { frames, cancel }
  }

  it('shows the bars at rest before the music plays', () => {
    mockFetch()
    installFakeAudioContext()
    render(<MusicToggle />)
    expect(barHeights()).toEqual(BARS.map(({ rest }) => rest))
  })

  it('drives the bars from the music while it plays', async () => {
    mockFetch()
    const fake = installFakeAudioContext()
    const { frames } = captureFrames()
    render(<MusicToggle />)
    await interact()
    act(() => {
      frames.at(-1)?.(0)
    })
    expect(fake.spectrum).toHaveBeenCalled()
    expect(barHeights()).toEqual(BARS.map(() => BAR_MAX))
  })

  it('stops the bars and shows the mute mark when muted', async () => {
    mockFetch()
    installFakeAudioContext()
    const { frames, cancel } = captureFrames()
    render(<MusicToggle />)
    await interact()
    expect(frames.length).toBeGreaterThan(0)
    await clickToggle(screen.getByRole('button', { name: ui.muteMusic }))
    expect(cancel).toHaveBeenCalled()
    expect(barHeights()).toEqual([])
  })

  it('keeps the bars still when the visitor prefers reduced motion', async () => {
    mockFetch()
    installFakeAudioContext()
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
    const { frames } = captureFrames()
    render(<MusicToggle />)
    await interact()
    expect(frames).toHaveLength(0)
    expect(barHeights()).toEqual(BARS.map(({ rest }) => rest))
  })
})
