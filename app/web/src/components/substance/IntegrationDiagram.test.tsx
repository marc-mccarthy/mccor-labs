import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IntegrationDiagram } from './IntegrationDiagram'

const SURFACES = ['Claude API', 'Postgres', 'Terraform']
const DESCRIPTION = 'External surfaces reachable inside the permission boundary.'

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

describe('IntegrationDiagram', () => {
  it('renders a label for every surface', () => {
    mockMatchMedia(false)
    render(<IntegrationDiagram surfaces={SURFACES} description={DESCRIPTION} />)
    SURFACES.forEach((surface) => {
      expect(screen.getByText(surface)).toBeInTheDocument()
    })
  })

  it('draws an explicit permission boundary around the surfaces', () => {
    mockMatchMedia(false)
    const { container } = render(
      <IntegrationDiagram surfaces={SURFACES} description={DESCRIPTION} />,
    )
    const boundaries = container.querySelectorAll('rect')
    expect(boundaries).toHaveLength(1)
    expect(container.querySelectorAll('circle')).toHaveLength(SURFACES.length)
  })

  it('exposes an accessible description via role, title and desc', () => {
    mockMatchMedia(false)
    const { container } = render(
      <IntegrationDiagram surfaces={SURFACES} description={DESCRIPTION} />,
    )
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('role', 'img')
    expect(svg?.querySelector('title')?.textContent).not.toBe('')
    expect(svg?.querySelector('desc')?.textContent).toContain(DESCRIPTION)
  })

  it('contains no raw color literals', () => {
    mockMatchMedia(false)
    const { container } = render(
      <IntegrationDiagram surfaces={SURFACES} description={DESCRIPTION} />,
    )
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })

  it('renders fully drawn under reduced motion', () => {
    mockMatchMedia(true)
    const { container } = render(
      <IntegrationDiagram surfaces={SURFACES} description={DESCRIPTION} />,
    )
    const boundary = container.querySelector('rect')
    expect(boundary?.style.strokeDashoffset).toBe('0')
  })

  it('centers each label column on its node', () => {
    mockMatchMedia(false)
    const { container } = render(
      <IntegrationDiagram surfaces={SURFACES} description={DESCRIPTION} />,
    )
    const svg = container.querySelector('svg')
    const width = Number(svg?.getAttribute('viewBox')?.split(' ')[2])
    const count = SURFACES.length
    expect(container.querySelector('ol')?.style.gridTemplateColumns).toBe(
      `repeat(${String(count)}, minmax(0, 1fr))`,
    )
    svg?.querySelectorAll('circle').forEach((node, index) => {
      const x =
        node.tagName === 'rect'
          ? Number(node.getAttribute('x')) + Number(node.getAttribute('width')) / 2
          : Number(node.getAttribute('cx'))
      expect(x / width).toBeCloseTo((index + 0.5) / count)
    })
  })

  it('draws a crimson boundary then lights the surfaces', () => {
    mockMatchMedia(true)
    const { container } = render(
      <IntegrationDiagram surfaces={SURFACES} description={DESCRIPTION} />,
    )
    expect(container.querySelector('rect')?.getAttribute('stroke')).toBe(
      'var(--color-brand)',
    )
    container
      .querySelector('svg')!
      .querySelectorAll('circle')
      .forEach((node) => {
        expect(node.style.stroke).toBe('var(--color-brand)')
        expect(node.style.transitionProperty).toBe('none')
        expect(node.style.transitionDelay).toBe('')
      })
  })

  it('leaves surfaces unlit before drawing', () => {
    mockMatchMedia(false)
    const { container } = render(
      <IntegrationDiagram surfaces={SURFACES} description={DESCRIPTION} />,
    )
    container
      .querySelector('svg')!
      .querySelectorAll('circle')
      .forEach((node) => {
        expect(node.style.stroke).toBe('var(--color-border-strong)')
      })
  })
})
