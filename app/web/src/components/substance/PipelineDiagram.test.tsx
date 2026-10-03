import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PipelineDiagram } from './PipelineDiagram'

const STAGES = [
  'ingestion',
  'chunking',
  'embedding',
  'vector store',
  'hybrid retrieval',
  'reranking',
  'evaluation',
]

const DESCRIPTION =
  'The retrieval-augmented generation pipeline, from ingestion to evaluation.'

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

describe('PipelineDiagram', () => {
  it('renders a label for every stage', () => {
    mockMatchMedia(false)
    const { getAllByRole } = render(
      <PipelineDiagram stages={STAGES} description={DESCRIPTION} />,
    )
    const items = getAllByRole('listitem')
    expect(items).toHaveLength(STAGES.length)
    STAGES.forEach((stage, index) => {
      expect(items[index]).toHaveTextContent(stage)
    })
  })

  it('exposes an accessible description via role, title and desc', () => {
    mockMatchMedia(false)
    const { container } = render(
      <PipelineDiagram stages={STAGES} description={DESCRIPTION} />,
    )
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('role', 'img')
    expect(svg?.querySelector('title')?.textContent).not.toBe('')
    expect(svg?.querySelector('desc')?.textContent).toContain(DESCRIPTION)
  })

  it('contains no raw colour literals', () => {
    mockMatchMedia(false)
    const { container } = render(
      <PipelineDiagram stages={STAGES} description={DESCRIPTION} />,
    )
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })

  it('renders fully drawn under reduced motion', () => {
    mockMatchMedia(true)
    const { container } = render(
      <PipelineDiagram stages={STAGES} description={DESCRIPTION} />,
    )
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBeGreaterThan(0)
    paths.forEach((path) => {
      expect(path.style.strokeDashoffset).toBe('0')
    })
  })
})
