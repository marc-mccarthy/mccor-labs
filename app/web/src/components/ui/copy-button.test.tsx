import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CopyButton } from './copy-button'

const props = {
  value: 'MC-7Q4K',
  label: 'Copy reference',
  copiedLabel: 'Copied',
  failedLabel: 'Copy failed, select the text instead',
}

function setClipboard(clipboard: unknown) {
  Object.defineProperty(navigator, 'clipboard', {
    value: clipboard,
    configurable: true,
  })
}

async function click() {
  await act(() => Promise.resolve(fireEvent.click(screen.getByRole('button'))))
}

describe('CopyButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    setClipboard(undefined)
  })

  it('writes the value to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    render(<CopyButton {...props} />)
    await click()
    expect(writeText).toHaveBeenCalledWith('MC-7Q4K')
  })

  it('shows the copied label then reverts after 2 s', async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) })
    render(<CopyButton {...props} />)
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Copy reference')
    await click()
    expect(button).toHaveTextContent('Copied')
    expect(screen.getByRole('status')).toHaveTextContent('Copied')
    act(() => {
      vi.advanceTimersByTime(1999)
    })
    expect(button).toHaveTextContent('Copied')
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(button).toHaveTextContent('Copy reference')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('restarts the 2 s window on a second click', async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) })
    render(<CopyButton {...props} />)
    const button = screen.getByRole('button')
    await click()
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    await click()
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(button).toHaveTextContent('Copied')
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(button).toHaveTextContent('Copy reference')
  })

  it('shows the failed text when the write rejects', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) })
    render(<CopyButton {...props} />)
    await click()
    const visible = screen.getByText(props.failedLabel, { selector: 'p' })
    expect(visible).toHaveClass('text-sm', 'text-brand')
    expect(screen.getByRole('status')).toHaveTextContent(props.failedLabel)
    expect(screen.getByRole('button')).toHaveTextContent('Copy reference')
  })

  it('shows the failed text when the clipboard is missing', async () => {
    setClipboard(undefined)
    render(<CopyButton {...props} />)
    await click()
    expect(screen.getByText(props.failedLabel, { selector: 'p' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent(props.failedLabel)
  })

  it('keeps the accessible name equal to the label throughout', async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) })
    render(<CopyButton {...props} />)
    expect(screen.getByRole('button', { name: 'Copy reference' })).toBeInTheDocument()
    await click()
    expect(screen.getByRole('button', { name: 'Copy reference' })).toHaveTextContent(
      'Copied',
    )
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByRole('button', { name: 'Copy reference' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /MC-7Q4K/ })).toBeNull()
  })

  it('clears the timer on unmount', async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) })
    const { unmount } = render(<CopyButton {...props} />)
    await click()
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
