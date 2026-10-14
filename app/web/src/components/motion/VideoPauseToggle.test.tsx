import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MOTION_STORAGE_KEY, MotionPauseProvider } from './MotionPauseProvider'
import { VideoPauseToggle } from './VideoPauseToggle'
import { ui } from '@/content/ui'

describe('VideoPauseToggle', () => {
  it('offers pause with aria-pressed false while playing', () => {
    render(<VideoPauseToggle paused={false} onToggle={() => undefined} />)
    const button = screen.getByRole('button', { name: ui.pauseVideo })
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps the same label with aria-pressed true while paused', () => {
    render(<VideoPauseToggle paused onToggle={() => undefined} />)
    expect(screen.getByRole('button', { name: ui.pauseVideo })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('is a 44px target that calls onToggle', async () => {
    const onToggle = vi.fn()
    render(<VideoPauseToggle paused={false} onToggle={onToggle} />)
    const button = screen.getByRole('button')
    expect(button.className).toContain('h-11')
    expect(button.className).toContain('w-11')
    await userEvent.click(button)
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('carries press feedback and switches its border to accent when pressed', () => {
    render(<VideoPauseToggle paused onToggle={() => undefined} />)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('press', 'aria-pressed:border-accent')
  })

  describe('while the page motion is paused', () => {
    afterEach(() => {
      window.localStorage.removeItem(MOTION_STORAGE_KEY)
      delete document.documentElement.dataset.motion
    })

    it('shows pressed, disables itself and ignores clicks', async () => {
      window.localStorage.setItem(MOTION_STORAGE_KEY, 'paused')
      const onToggle = vi.fn()
      render(
        <MotionPauseProvider>
          <VideoPauseToggle paused={false} onToggle={onToggle} />
        </MotionPauseProvider>,
      )
      const button = screen.getByRole('button', { name: ui.pauseVideo })
      expect(button).toHaveAttribute('aria-pressed', 'true')
      expect(button).toHaveAttribute('aria-disabled', 'true')
      await userEvent.click(button)
      expect(onToggle).not.toHaveBeenCalled()
    })
  })
})
