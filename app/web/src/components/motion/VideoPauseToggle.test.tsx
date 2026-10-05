import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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
})
