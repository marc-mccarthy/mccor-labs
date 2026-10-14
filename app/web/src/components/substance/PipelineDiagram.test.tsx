import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  PACKET_END,
  PACKET_START,
  packetAlong,
  PipelineDiagram,
  stageIndexAt,
} from './PipelineDiagram'

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
  it('draws a vertical column with labels beside nodes below sm and a row from sm up', () => {
    mockMatchMedia(false)
    const { container } = render(
      <PipelineDiagram stages={STAGES} description={DESCRIPTION} />,
    )
    const [row, column] = container.querySelectorAll('svg')
    expect(row).toHaveClass(
      'w-full',
      'max-sm:absolute',
      'max-sm:opacity-0',
      'max-sm:pointer-events-none',
    )
    expect(column).toHaveClass('sm:hidden')
    expect(column).toHaveAttribute('aria-hidden', 'true')
    expect(column?.querySelectorAll('circle')).toHaveLength(STAGES.length)
    expect(container.querySelector('ol')).toHaveClass(
      'flex-col',
      'sm:grid',
      'sm:text-center',
    )
    container.querySelectorAll('li').forEach((item) => {
      expect(item).toHaveClass('max-sm:h-16')
    })
  })

  it('names the diagram once', () => {
    mockMatchMedia(false)
    const { container } = render(
      <PipelineDiagram stages={STAGES} description={DESCRIPTION} />,
    )
    expect(container.querySelectorAll('[role="img"]')).toHaveLength(1)
    expect(container.querySelectorAll('title')).toHaveLength(1)
    expect(container.querySelectorAll('desc')).toHaveLength(1)
  })

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

  it('contains no raw color literals', () => {
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
      expect(path.style.transitionProperty).toBe('none')
      expect(path.style.transitionDelay).toBe('')
      expect(path.style.transitionDuration).toBe('')
    })
  })

  it('centers each label column on its node', () => {
    mockMatchMedia(false)
    const { container } = render(
      <PipelineDiagram stages={STAGES} description={DESCRIPTION} />,
    )
    const svg = container.querySelector('svg')
    const width = Number(svg?.getAttribute('viewBox')?.split(' ')[2])
    const count = STAGES.length
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

  it('staggers edges and keeps nodes unlit until drawn', () => {
    mockMatchMedia(false)
    const { container } = render(
      <PipelineDiagram stages={STAGES} description={DESCRIPTION} />,
    )
    const paths = container.querySelector('svg')!.querySelectorAll('path')
    paths.forEach((path, index) => {
      expect(path.style.transitionDelay).toBe(
        `calc(${String(index)} * var(--stagger-interval))`,
      )
      expect(path.getAttribute('stroke')).toBe('var(--color-brand)')
      expect(path.style.strokeDashoffset).toBe('1')
    })
    container
      .querySelector('svg')!
      .querySelectorAll('circle')
      .forEach((node) => {
        expect(node.style.stroke).toBe('var(--color-border-strong)')
      })
  })

  it('lights nodes in sequence once drawn', () => {
    mockMatchMedia(false)
    class ImmediateObserver {
      constructor(private readonly callback: IntersectionObserverCallback) {}
      observe() {
        this.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as never,
        )
      }
      disconnect = vi.fn()
    }
    vi.stubGlobal('IntersectionObserver', ImmediateObserver)
    const { container } = render(
      <PipelineDiagram stages={STAGES} description={DESCRIPTION} />,
    )
    vi.unstubAllGlobals()
    const nodes = container.querySelector('svg')!.querySelectorAll('circle')
    nodes.forEach((node, index) => {
      expect(node.style.stroke).toBe('var(--color-brand)')
      expect(node.style.transitionDelay).toBe(
        index === 0
          ? '0s'
          : `calc(${String(index - 1)} * var(--stagger-interval) + var(--duration-scene))`,
      )
    })
    container
      .querySelector('svg')!
      .querySelectorAll('path')
      .forEach((path) => {
        expect(path.style.strokeDashoffset).toBe('0')
      })
  })

  it('shows lit nodes with no transition under reduced motion', () => {
    mockMatchMedia(true)
    const { container } = render(
      <PipelineDiagram stages={STAGES} description={DESCRIPTION} />,
    )
    container
      .querySelector('svg')!
      .querySelectorAll('circle')
      .forEach((node) => {
        expect(node.style.stroke).toBe('var(--color-brand)')
        expect(node.style.transitionProperty).toBe('none')
      })
  })
})

const DESCRIPTORS = STAGES.map((stage) => `${stage} detail`)

function renderScrubbed(activeIndex: number) {
  return render(
    <PipelineDiagram
      stages={STAGES}
      description={DESCRIPTION}
      descriptors={DESCRIPTORS}
      activeIndex={activeIndex}
    />,
  )
}

function rowNodes(container: HTMLElement) {
  return [...container.querySelector('svg')!.querySelectorAll('circle')]
}

function rowTints(container: HTMLElement) {
  return [...container.querySelector('svg')!.querySelectorAll('[data-stage-tint]')]
}

function descriptorsOf(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('[data-stage-descriptor]')]
}

describe('PipelineDiagram default path', () => {
  it('adds no stage states, tints or descriptors without activeIndex', () => {
    mockMatchMedia(false)
    const { container } = render(
      <PipelineDiagram stages={STAGES} description={DESCRIPTION} />,
    )
    expect(container.querySelector('[data-stage-state]')).toBeNull()
    expect(container.querySelector('[data-stage-tint]')).toBeNull()
    expect(container.querySelector('[data-stage-descriptor]')).toBeNull()
    expect(container.querySelector('rect')).toBeNull()
    container.querySelectorAll('li').forEach((item) => {
      expect(item).toHaveClass('max-sm:items-center')
    })
  })
})

describe('PipelineDiagram with activeIndex', () => {
  it('marks stages up to the active one passed and the rest pending', () => {
    mockMatchMedia(false)
    const { getAllByRole } = renderScrubbed(2)
    expect(getAllByRole('listitem').map((item) => item.dataset.stageState)).toEqual([
      'passed',
      'passed',
      'passed',
      'pending',
      'pending',
      'pending',
      'pending',
    ])
  })

  it('marks every stage pending before the packet reaches the first', () => {
    mockMatchMedia(false)
    const { container } = renderScrubbed(-1)
    expect(container.querySelectorAll('[data-stage-state="pending"]')).toHaveLength(
      STAGES.length,
    )
  })

  it('strokes passed nodes with the brand token and lays a brand tint over the surface fill', () => {
    mockMatchMedia(false)
    const { container } = renderScrubbed(2)
    rowNodes(container).forEach((node, index) => {
      expect(node.getAttribute('fill')).toBe('var(--color-surface)')
      expect(node.style.stroke).toBe(
        index <= 2 ? 'var(--color-brand)' : 'var(--color-border-strong)',
      )
    })
    const tints = rowTints(container)
    expect(tints).toHaveLength(STAGES.length)
    tints.forEach((tint, index) => {
      expect(tint.tagName.toLowerCase()).toBe('rect')
      expect(tint.getAttribute('style')).toContain(
        'color-mix(in oklab, var(--color-brand) 20%, transparent)',
      )
      expect((tint as SVGElement).style.opacity).toBe(index <= 2 ? '1' : '0')
    })
  })

  it('draws an edge once the stage it leads into has passed', () => {
    mockMatchMedia(false)
    const { container } = renderScrubbed(2)
    const edges = [...container.querySelector('svg')!.querySelectorAll('path')]
    edges.forEach((edge, index) => {
      expect(edge.style.strokeDashoffset).toBe(index + 1 <= 2 ? '0' : '1')
      expect(edge.style.transitionDelay).toBe('')
    })
  })

  it('keeps one node circle per stage in each diagram', () => {
    mockMatchMedia(false)
    const { container } = renderScrubbed(3)
    const [row, column] = container.querySelectorAll('svg')
    expect(row?.querySelectorAll('circle')).toHaveLength(STAGES.length)
    expect(column?.querySelectorAll('circle')).toHaveLength(STAGES.length)
    expect(container.querySelectorAll('[role="img"]')).toHaveLength(1)
    expect(container.querySelectorAll('title')).toHaveLength(1)
    expect(container.querySelectorAll('desc')).toHaveLength(1)
    expect(column).toHaveAttribute('aria-hidden', 'true')
  })

  it('hides pending descriptors fully, keeps their space, and shows them below sm', () => {
    mockMatchMedia(false)
    const { container } = renderScrubbed(1)
    const descriptors = descriptorsOf(container)
    expect(descriptors.map((item) => item.textContent)).toEqual(DESCRIPTORS)
    descriptors.forEach((item, index) => {
      expect(item.closest('li')).not.toBeNull()
      if (index <= 1) {
        expect(item).not.toHaveClass('opacity-0')
        expect(item.className).not.toMatch(/opacity-(?!0\b|100\b)\d+/)
      } else {
        expect(item).toHaveClass(
          'opacity-0',
          'max-sm:opacity-100',
          'motion-reduce:opacity-100',
        )
      }
    })
    container.querySelectorAll('li').forEach((item) => {
      expect(item).toHaveClass('max-sm:h-16', 'max-sm:flex-col')
    })
  })

  it('ignores useScrollDrawn when activeIndex is present', () => {
    mockMatchMedia(false)
    class ImmediateObserver {
      constructor(private readonly callback: IntersectionObserverCallback) {}
      observe() {
        this.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as never,
        )
      }
      disconnect = vi.fn()
    }
    vi.stubGlobal('IntersectionObserver', ImmediateObserver)
    const { container } = renderScrubbed(0)
    vi.unstubAllGlobals()
    rowNodes(container).forEach((node, index) => {
      expect(node.style.stroke).toBe(
        index === 0 ? 'var(--color-brand)' : 'var(--color-border-strong)',
      )
      expect(node.style.transitionDelay).toBe('')
    })
  })

  it('gates node and edge transitions behind motion-on so reduce and paused change instantly', () => {
    mockMatchMedia(false)
    const { container } = renderScrubbed(3)
    const svg = container.querySelector('svg')!
    ;[...svg.querySelectorAll('circle, path, [data-stage-tint]')].forEach((shape) => {
      const classes = shape.getAttribute('class') ?? ''
      classes.split(' ').forEach((name) => {
        if (name.includes('transition') || name.includes('duration')) {
          expect(name.startsWith('motion-on:')).toBe(true)
        }
      })
    })
    descriptorsOf(container).forEach((item) => {
      expect(item.className).not.toContain('transition')
    })
  })

  it('ignores activeIndex under reduced motion and shows every stage passed', () => {
    mockMatchMedia(true)
    const { container } = renderScrubbed(-1)
    expect(container.querySelectorAll('[data-stage-state="passed"]')).toHaveLength(
      STAGES.length,
    )
    descriptorsOf(container).forEach((item) => {
      expect(item).not.toHaveClass('opacity-0')
    })
    rowNodes(container).forEach((node) => {
      expect(node.style.stroke).toBe('var(--color-brand)')
    })
    rowTints(container).forEach((tint) => {
      expect((tint as SVGElement).style.opacity).toBe('1')
    })
  })
})

describe('stageIndexAt', () => {
  const count = STAGES.length

  it('reaches no stage before the packet window and every stage after it', () => {
    expect(stageIndexAt(0, count)).toBe(-1)
    expect(stageIndexAt(PACKET_START, count)).toBe(-1)
    expect(stageIndexAt(PACKET_END, count)).toBe(count - 1)
    expect(stageIndexAt(1, count)).toBe(count - 1)
  })

  it('advances one stage at a time as progress rises through the window', () => {
    const seen: number[] = []
    for (let step = 0; step <= 1000; step += 1) {
      const index = stageIndexAt(step / 1000, count)
      if (seen.at(-1) !== index) seen.push(index)
    }
    expect(seen).toEqual([-1, 0, 1, 2, 3, 4, 5, 6])
  })

  it('reaches a stage when the packet head crosses its node centre', () => {
    const progressAt = (along: number) => {
      let low = 0
      let high = 1
      for (let i = 0; i < 60; i += 1) {
        const mid = (low + high) / 2
        if (packetAlong(mid) < along) low = mid
        else high = mid
      }
      return high
    }
    for (let index = 0; index < count; index += 1) {
      const crossing = progressAt(index / (count - 1))
      expect(stageIndexAt(crossing - 0.0005, count)).toBe(index - 1)
      expect(stageIndexAt(crossing + 0.0005, count)).toBe(index)
    }
    expect(packetAlong(0)).toBeLessThan(0)
    expect(packetAlong(1)).toBeGreaterThan(1)
  })
})
