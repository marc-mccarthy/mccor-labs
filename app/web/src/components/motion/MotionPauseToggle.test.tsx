import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ui } from '@/content/ui'
import { MOTION_STORAGE_KEY, MotionPauseProvider } from './MotionPauseProvider'
import { MotionPauseToggle } from './MotionPauseToggle'

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

function renderToggle() {
  render(
    <MotionPauseProvider>
      <MotionPauseToggle />
    </MotionPauseProvider>,
  )
  return screen.getByRole('button', { name: ui.pauseMotion })
}

describe('MotionPauseToggle', () => {
  let reportError: ReturnType<typeof vi.fn<(error: unknown) => void>>

  beforeEach(() => {
    reportError = vi.fn<(error: unknown) => void>()
    vi.stubGlobal('reportError', reportError)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    localStorage.clear()
    delete document.documentElement.dataset.motion
  })

  it('is an unpressed, enabled toggle by default', () => {
    mockMatchMedia(false)
    const toggle = renderToggle()
    expect(toggle).toHaveAttribute('type', 'button')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(toggle).not.toHaveAttribute('aria-disabled')
    expect(toggle).not.toHaveAccessibleDescription()
  })

  it('flips data-motion and aria-pressed and persists the choice', async () => {
    mockMatchMedia(false)
    const toggle = renderToggle()
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement).toHaveAttribute('data-motion', 'paused')
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe('paused')

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(document.documentElement).not.toHaveAttribute('data-motion')
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBeNull()
  })

  it('reports a storage failure instead of swallowing it, and still pauses', async () => {
    mockMatchMedia(false)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const toggle = renderToggle()
    await userEvent.click(toggle)
    expect(reportError).toHaveBeenCalledTimes(1)
    expect(reportError.mock.calls[0]?.[0]).toBeInstanceOf(Error)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement).toHaveAttribute('data-motion', 'paused')
  })

  it('shows pressed and disabled with a hint under the OS setting, and clicking does nothing', async () => {
    mockMatchMedia(true)
    const toggle = renderToggle()
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(toggle).toHaveAttribute('aria-disabled', 'true')
    expect(toggle).toHaveAccessibleDescription(ui.pauseMotionSystemHint)

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement).not.toHaveAttribute('data-motion')
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBeNull()
  })

  it('draws a path-only icon with no text', () => {
    mockMatchMedia(false)
    const toggle = renderToggle()
    const svg = toggle.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg?.querySelector('text')).toBeNull()
    expect(svg?.textContent).toBe('')
    expect(svg?.querySelectorAll('path').length).toBeGreaterThan(0)
  })
})
