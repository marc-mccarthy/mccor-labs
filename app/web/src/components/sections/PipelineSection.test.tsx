import { act, render, screen, within } from '@testing-library/react'
import { Profiler } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MOTION_STORAGE_KEY,
  MotionPauseProvider,
} from '@/components/motion/MotionPauseProvider'
import {
  PACKET_END,
  PACKET_LEAD,
  PACKET_START,
} from '@/components/substance/PipelineDiagram'
import type { useScrollProgressValue } from '@/components/motion/useScrollProgress'
import { retrievalPipeline, retrievalStageDescriptors } from '@/content/substance'
import { ui } from '@/content/ui'
import { PipelineSection } from './PipelineSection'

type Progress = ReturnType<typeof useScrollProgressValue>

const scene = vi.hoisted(() => ({
  progress: null as Progress | null,
}))

vi.mock('@/components/effects/Pipeline3D', () => ({
  Pipeline3D: ({ className, progress }: { className?: string; progress?: Progress }) => {
    scene.progress = progress ?? null
    return <div data-testid="pipeline-3d" className={className} />
  },
}))

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

const STAGES = retrievalPipeline.stages.length
const viewport = window.innerHeight
const height = viewport * 0.6
let top = viewport

function scrollToProgress(progress: number) {
  top = viewport - progress * (viewport + height)
  act(() => {
    window.dispatchEvent(new Event('scroll'))
  })
}

function progressReaching(index: number): number {
  const along = index / (STAGES - 1)
  const travel = (along + PACKET_LEAD) / (1 + 2 * PACKET_LEAD)
  return PACKET_START + travel * (PACKET_END - PACKET_START) + 0.001
}

function stageStates(container: HTMLElement) {
  return [...container.querySelectorAll('li[data-stage-state]')].map((item) =>
    item.getAttribute('data-stage-state'),
  )
}

function passedCount(container: HTMLElement) {
  return container.querySelectorAll('[data-stage-state="passed"]').length
}

function hiddenDescriptors(container: HTMLElement) {
  return [...container.querySelectorAll('[data-stage-descriptor]')].filter((item) =>
    item.classList.contains('opacity-0'),
  ).length
}

describe('PipelineSection', () => {
  beforeEach(() => {
    top = viewport
    scene.progress = null
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ top, height }) as DOMRect,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
    delete document.documentElement.dataset.motion
  })

  it('keeps the numbered eyebrow and the heading', () => {
    mockMatchMedia(false)
    render(<PipelineSection />)
    const eyebrow = screen.getByTestId('eyebrow-tick').parentElement!
    expect(within(eyebrow).getByText(ui.eyebrows.retrieval)).toBeInTheDocument()
    expect(within(eyebrow).getByText('03')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: ui.pipelineHeading }),
    ).toBeInTheDocument()
  })

  it('renders one descriptor per stage from the shared content', () => {
    mockMatchMedia(false)
    const { container } = render(<PipelineSection />)
    expect(retrievalStageDescriptors).toHaveLength(STAGES)
    const descriptors = [...container.querySelectorAll('[data-stage-descriptor]')]
    expect(descriptors.map((item) => item.textContent)).toEqual([
      ...retrievalStageDescriptors,
    ])
  })

  it('holds every stage pending while the section is below the fold', () => {
    mockMatchMedia(false)
    const { container } = render(<PipelineSection />)
    expect(stageStates(container)).toEqual(Array(STAGES).fill('pending'))
    expect(hiddenDescriptors(container)).toBe(STAGES)
  })

  it('lights each stage in order as the packet passes and reverses on the way back', () => {
    mockMatchMedia(false)
    const { container } = render(<PipelineSection />)
    scrollToProgress(PACKET_START)
    expect(passedCount(container)).toBe(0)
    for (let index = 0; index < STAGES; index += 1) {
      scrollToProgress(progressReaching(index))
      expect(passedCount(container)).toBe(index + 1)
      expect(hiddenDescriptors(container)).toBe(STAGES - index - 1)
    }
    scrollToProgress(1)
    expect(passedCount(container)).toBe(STAGES)
    scrollToProgress(0)
    expect(passedCount(container)).toBe(0)
  })

  it('feeds the same section progress to the 3D scene', async () => {
    mockMatchMedia(false)
    render(<PipelineSection />)
    await screen.findByTestId('pipeline-3d')
    scrollToProgress(0.5)
    expect(scene.progress?.get()).toBeCloseTo(0.5)
  })

  it('commits once per stage crossing, never per scroll frame', () => {
    mockMatchMedia(false)
    const onRender = vi.fn()
    render(
      <Profiler id="pipeline" onRender={onRender}>
        <PipelineSection />
      </Profiler>,
    )
    scrollToProgress(progressReaching(2))
    const settled = onRender.mock.calls.length
    const step = (progressReaching(3) - progressReaching(2)) / 6
    for (let frame = 1; frame < 5; frame += 1) {
      scrollToProgress(progressReaching(2) + step * frame)
    }
    expect(onRender.mock.calls.length).toBe(settled)
    scrollToProgress(progressReaching(3))
    expect(onRender.mock.calls.length).toBe(settled + 1)
  })

  it('keeps updating stage states while motion is paused', () => {
    mockMatchMedia(false)
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'paused')
    const { container } = render(
      <MotionPauseProvider>
        <PipelineSection />
      </MotionPauseProvider>,
    )
    expect(document.documentElement.dataset.motion).toBe('paused')
    scrollToProgress(progressReaching(4))
    expect(passedCount(container)).toBe(5)
  })

  it('shows every stage passed and every descriptor under reduced motion with no scene', () => {
    mockMatchMedia(true)
    const { container } = render(<PipelineSection />)
    expect(stageStates(container)).toEqual(Array(STAGES).fill('passed'))
    expect(hiddenDescriptors(container)).toBe(0)
    expect(screen.queryByTestId('pipeline-3d')).toBeNull()
    expect(container.querySelector('[data-scene-status="fallback"]')).not.toBeNull()
  })

  it('keeps the section to its natural height with no pin', () => {
    mockMatchMedia(false)
    const { container } = render(<PipelineSection />)
    const section = container.querySelector('section')!
    expect(section.className).not.toMatch(/\b(min-)?h-\[?\d/)
    expect(container.querySelector('[style*="sticky"]')).toBeNull()
    expect(container.querySelector('[class*="sticky"]')).toBeNull()
  })
})
