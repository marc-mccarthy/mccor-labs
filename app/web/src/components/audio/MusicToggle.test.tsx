import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ui } from '@/content/ui'
import { FADE_IN_SECONDS, FADE_OUT_SECONDS, MUSIC_SRC, MusicToggle } from './MusicToggle'

interface FakeAudio {
  resume: ReturnType<typeof vi.fn>
  suspend: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  ramp: ReturnType<typeof vi.fn>
  decode: ReturnType<typeof vi.fn>
  source: { loop: boolean; loopStart: number; loopEnd: number; buffer: unknown }
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
  }
  const gainNode = {
    gain: {
      value: 0,
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: fake.ramp,
    },
    connect: vi.fn(),
  }
  class FakeAudioContext {
    currentTime = 10
    destination = {}
    resume = fake.resume
    suspend = fake.suspend
    close = fake.close
    decodeAudioData = fake.decode
    createGain = () => gainNode
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
  })

  it('starts silent, unpressed, and fetches nothing', () => {
    const fetchMock = mockFetch()
    installFakeAudioContext()
    render(<MusicToggle />)
    const toggle = screen.getByRole('button', { name: ui.playMusic })
    expect(toggle).toHaveAttribute('type', 'button')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loads the loop, starts it, and fades in on the first press', async () => {
    const fetchMock = mockFetch()
    const fake = installFakeAudioContext()
    render(<MusicToggle />)
    const toggle = screen.getByRole('button', { name: ui.playMusic })
    await clickToggle(toggle)
    expect(fetchMock).toHaveBeenCalledWith(MUSIC_SRC)
    expect(fake.source.loop).toBe(true)
    expect(fake.source.loopStart).toBeGreaterThan(0)
    expect(fake.source.loopEnd).toBeLessThan(124)
    expect(fake.start).toHaveBeenCalledTimes(1)
    expect(fake.resume).toHaveBeenCalledTimes(2)
    expect(fake.ramp).toHaveBeenCalledWith(1, 10 + FADE_IN_SECONDS)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(toggle).not.toHaveAttribute('aria-busy')
  })

  it('fades out and suspends on the second press without reloading', async () => {
    const fetchMock = mockFetch()
    const fake = installFakeAudioContext()
    render(<MusicToggle />)
    const toggle = screen.getByRole('button', { name: ui.playMusic })
    await clickToggle(toggle)
    await clickToggle(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
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
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })

  it('reports a failed load and stays unpressed', async () => {
    mockFetch(false)
    const fake = installFakeAudioContext()
    render(<MusicToggle />)
    const toggle = screen.getByRole('button', { name: ui.playMusic })
    await clickToggle(toggle)
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
    await clickToggle(screen.getByRole('button', { name: ui.playMusic }))
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
    await clickToggle(screen.getByRole('button', { name: ui.playMusic }))
    unmount()
    expect(fake.close).toHaveBeenCalledTimes(1)
  })

  it('closes the context when fetch rejects or decoding fails', async () => {
    const fake = installFakeAudioContext()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    const { unmount } = render(<MusicToggle />)
    const toggle = screen.getByRole('button', { name: ui.playMusic })
    await clickToggle(toggle)
    expect(fake.close).toHaveBeenCalledTimes(1)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    unmount()

    mockFetch()
    fake.decode.mockRejectedValue(new DOMException('bad', 'EncodingError'))
    render(<MusicToggle />)
    await clickToggle(screen.getByRole('button', { name: ui.playMusic }))
    expect(fake.close).toHaveBeenCalledTimes(2)
    expect(reportError).toHaveBeenCalledTimes(2)
  })

  it('marks the button busy and ignores clicks while the loop loads', async () => {
    const fake = installFakeAudioContext()
    let resolveFetch: (value: unknown) => void = () => undefined
    const fetchMock = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<MusicToggle />)
    const toggle = screen.getByRole('button', { name: ui.playMusic })
    await clickToggle(toggle)
    await clickToggle(toggle)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(toggle).toHaveAttribute('aria-busy', 'true')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await act(async () => {
      resolveFetch({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      })
      await Promise.resolve()
    })
    expect(toggle).not.toHaveAttribute('aria-busy')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(fake.start).toHaveBeenCalledTimes(1)
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
    await clickToggle(screen.getByRole('button', { name: ui.playMusic }))
    unmount()
    await act(async () => {
      resolveFetch({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      })
      await Promise.resolve()
    })
    expect(fake.close).toHaveBeenCalledTimes(1)
    expect(fake.ramp).not.toHaveBeenCalledWith(1, expect.anything())
  })

  it('keeps the loop suspended when the tab is hidden by the time the load finishes', async () => {
    mockFetch()
    const fake = installFakeAudioContext()
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    render(<MusicToggle />)
    const toggle = screen.getByRole('button', { name: ui.playMusic })
    await clickToggle(toggle)
    expect(fake.suspend).toHaveBeenCalledTimes(1)
    expect(fake.resume).toHaveBeenCalledTimes(1)
    expect(fake.ramp).toHaveBeenCalledWith(1, 10 + FADE_IN_SECONDS)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })

  it('draws a path-only icon with no text', () => {
    mockFetch()
    installFakeAudioContext()
    render(<MusicToggle />)
    const svg = screen.getByRole('button', { name: ui.playMusic }).querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg?.querySelector('text')).toBeNull()
    expect(svg?.textContent).toBe('')
    expect(svg?.querySelectorAll('path').length).toBeGreaterThan(0)
  })
})
