import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Eyebrow } from './eyebrow'

describe('Eyebrow', () => {
  it('renders tick, index, slash and label in a mono uppercase line', () => {
    const { container } = render(<Eyebrow index="01" label="Build" />)
    const line = container.firstElementChild as HTMLElement
    expect(line.tagName).toBe('P')
    expect(line.className).toBe(
      'mb-4 flex items-center gap-3 font-mono text-xs tracking-widest uppercase',
    )
    expect(screen.getByText('01')).toHaveClass('text-text')
    expect(screen.getByText('Build')).toHaveClass('text-muted')
    expect(screen.getByText('/')).toHaveAttribute('aria-hidden', 'true')
  })

  it('hides the tick from assistive tech and draws it only under motion-on', () => {
    render(<Eyebrow index="01" label="Build" />)
    const tick = screen.getByTestId('eyebrow-tick')
    expect(tick).toHaveAttribute('aria-hidden', 'true')
    expect(tick).toHaveClass('h-px', 'w-4', 'bg-brand')
    expect(tick.className).toContain('motion-on:animate-[band-signal_')
    expect(tick.className).not.toMatch(/(^|\s)animate-/)
  })

  it('merges a className onto the line', () => {
    const { container } = render(
      <Eyebrow index="01" label="Build" className="mb-0 text-sm" />,
    )
    const line = container.firstElementChild as HTMLElement
    expect(line).toHaveClass('mb-0', 'text-sm', 'font-mono', 'uppercase')
    expect(line).not.toHaveClass('mb-4')
    expect(line).not.toHaveClass('text-xs')
  })
})
