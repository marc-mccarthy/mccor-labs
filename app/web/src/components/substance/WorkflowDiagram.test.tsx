import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WorkflowDiagram } from './WorkflowDiagram'

const STEPS = [
  { label: 'draft' },
  { label: 'review', gate: 'human' as const },
  { label: 'deploy', gate: 'cost' as const },
  { label: 'monitor' },
]

const DESCRIPTION = 'The deployment workflow, with human and cost approval gates.'

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe('WorkflowDiagram', () => {
  it('renders a label for every step', () => {
    mockMatchMedia(false)
    render(<WorkflowDiagram steps={STEPS} description={DESCRIPTION} />)
    STEPS.forEach((step) => {
      expect(screen.getByText(step.label)).toBeInTheDocument()
    })
  })

  it('marks a human-approval gate distinctly from a cost gate', () => {
    mockMatchMedia(false)
    const { container } = render(
      <WorkflowDiagram steps={STEPS} description={DESCRIPTION} />,
    )
    expect(screen.getByText('Human approval gate')).toBeInTheDocument()
    expect(screen.getByText('Cost gate')).toBeInTheDocument()
    const gateRects = container.querySelectorAll('rect')
    expect(gateRects).toHaveLength(2)
    const strokes = Array.from(gateRects).map((rect) => rect.getAttribute('stroke'))
    expect(new Set(strokes).size).toBe(2)
  })

  it('exposes an accessible description via role, title and desc', () => {
    mockMatchMedia(false)
    const { container } = render(
      <WorkflowDiagram steps={STEPS} description={DESCRIPTION} />,
    )
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('role', 'img')
    expect(svg?.querySelector('title')?.textContent).not.toBe('')
    expect(svg?.querySelector('desc')?.textContent).toContain(DESCRIPTION)
  })

  it('contains no raw colour literals', () => {
    mockMatchMedia(false)
    const { container } = render(
      <WorkflowDiagram steps={STEPS} description={DESCRIPTION} />,
    )
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })

  it('renders fully drawn under reduced motion', () => {
    mockMatchMedia(true)
    const { container } = render(
      <WorkflowDiagram steps={STEPS} description={DESCRIPTION} />,
    )
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBeGreaterThan(0)
    paths.forEach((path) => {
      expect(path.style.strokeDashoffset).toBe('0')
    })
  })
})
