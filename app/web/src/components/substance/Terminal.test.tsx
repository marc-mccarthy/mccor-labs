import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Terminal } from './Terminal'

const LINES = [
  { kind: 'command' as const, text: 'pnpm build' },
  { kind: 'output' as const, text: 'Build complete' },
]

describe('Terminal', () => {
  it('renders a prompt marker on command lines only', () => {
    const { container } = render(<Terminal lines={LINES} />)
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1)
  })

  it('renders output lines verbatim', () => {
    render(<Terminal lines={LINES} />)
    expect(screen.getByText('Build complete')).toBeInTheDocument()
    expect(screen.getByText('pnpm build')).toBeInTheDocument()
  })

  it('marks the marker aria-hidden', () => {
    const { container } = render(<Terminal lines={LINES} />)
    const marker = container.querySelector('[aria-hidden="true"]')
    expect(marker).not.toBeNull()
    expect(marker?.getAttribute('aria-hidden')).toBe('true')
  })
})
