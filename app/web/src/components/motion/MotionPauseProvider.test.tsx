import { act, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOTION_STORAGE_KEY,
  MotionPauseProvider,
  useMotionPaused,
} from './MotionPauseProvider'
import { usePointerEffects } from './useReducedMotion'

function mockMatchMedia({ reduced = false, fine = true } = {}) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches:
      (reduced && query === '(prefers-reduced-motion: reduce)') ||
      (fine && query === '(hover: hover) and (pointer: fine)'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

function Probe() {
  const { paused, osReduced, toggle } = useMotionPaused()
  const pointer = usePointerEffects()
  return (
    <button
      type="button"
      data-paused={String(paused)}
      data-os-reduced={String(osReduced)}
      data-pointer={String(pointer)}
      onClick={toggle}
    >
      probe
    </button>
  )
}

function renderProbe() {
  render(
    <MotionPauseProvider>
      <Probe />
    </MotionPauseProvider>,
  )
  return screen.getByRole('button', { name: 'probe' })
}

describe('MotionPauseProvider', () => {
  let reportError: ReturnType<typeof vi.fn<(error: unknown) => void>>

  beforeEach(() => {
    mockMatchMedia()
    reportError = vi.fn<(error: unknown) => void>()
    vi.stubGlobal('reportError', reportError)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    localStorage.clear()
    delete document.documentElement.dataset.motion
  })

  it('starts unpaused with no data-motion attribute', () => {
    const probe = renderProbe()
    expect(probe).toHaveAttribute('data-paused', 'false')
    expect(document.documentElement).not.toHaveAttribute('data-motion')
  })

  it('pauses page-wide, persists the choice, and resumes on a second toggle', () => {
    const probe = renderProbe()
    act(() => {
      probe.click()
    })
    expect(probe).toHaveAttribute('data-paused', 'true')
    expect(document.documentElement).toHaveAttribute('data-motion', 'paused')
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe('paused')

    act(() => {
      probe.click()
    })
    expect(probe).toHaveAttribute('data-paused', 'false')
    expect(document.documentElement).not.toHaveAttribute('data-motion')
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBeNull()
  })

  it('restores a stored pause on mount', () => {
    localStorage.setItem(MOTION_STORAGE_KEY, 'paused')
    const probe = renderProbe()
    expect(probe).toHaveAttribute('data-paused', 'true')
    expect(document.documentElement).toHaveAttribute('data-motion', 'paused')
  })

  it('reports a failed save and still pauses for this page', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const probe = renderProbe()
    act(() => {
      probe.click()
    })
    expect(probe).toHaveAttribute('data-paused', 'true')
    expect(document.documentElement).toHaveAttribute('data-motion', 'paused')
    expect(reportError).toHaveBeenCalledTimes(1)
    const [reported] = reportError.mock.calls[0] ?? []
    expect(reported).toBeInstanceOf(Error)
    expect((reported as Error).cause).toBeInstanceOf(DOMException)
  })

  it('reports a failed read on mount and keeps the attribute the page loaded with', () => {
    document.documentElement.dataset.motion = 'paused'
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    const probe = renderProbe()
    expect(reportError).toHaveBeenCalledTimes(1)
    expect(probe).toHaveAttribute('data-paused', 'true')
  })

  it('reports the OS setting and never toggles against it', () => {
    mockMatchMedia({ reduced: true })
    const probe = renderProbe()
    expect(probe).toHaveAttribute('data-os-reduced', 'true')
    act(() => {
      probe.click()
    })
    expect(probe).toHaveAttribute('data-paused', 'false')
    expect(document.documentElement).not.toHaveAttribute('data-motion')
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBeNull()
  })

  it('turns pointer effects off while paused', () => {
    const probe = renderProbe()
    expect(probe).toHaveAttribute('data-pointer', 'true')
    act(() => {
      probe.click()
    })
    expect(probe).toHaveAttribute('data-pointer', 'false')
  })

  it('renders the server snapshot unpaused even when a pause is stored', () => {
    localStorage.setItem(MOTION_STORAGE_KEY, 'paused')
    document.documentElement.dataset.motion = 'paused'
    const html = renderToString(
      <MotionPauseProvider>
        <Probe />
      </MotionPauseProvider>,
    )
    expect(html).toContain('data-paused="false"')
  })

  it('reads unpaused and refuses to toggle without a provider', () => {
    const captured: { toggle: (() => void) | null } = { toggle: null }
    function Orphan() {
      const state = useMotionPaused()
      useEffect(() => {
        captured.toggle = state.toggle
      })
      return <p data-paused={String(state.paused)}>orphan</p>
    }
    render(<Orphan />)
    expect(screen.getByText('orphan')).toHaveAttribute('data-paused', 'false')
    expect(captured.toggle).toThrow(/MotionPauseProvider/)
  })
})
