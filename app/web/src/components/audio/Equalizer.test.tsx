import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MotionPauseProvider,
  MOTION_STORAGE_KEY,
} from '@/components/motion/MotionPauseProvider'
import {
  BAR_COUNT,
  bandDecibels,
  bandEdges,
  CENTER,
  Equalizer,
  FLOOR,
  HIDDEN_WIDTHS,
  levelAround,
  REST,
  SWING_DB,
} from './Equalizer'

function fakeAnalyser(fill: (data: Float32Array) => void) {
  const spectrum = vi.fn(fill)
  const analyser = {
    frequencyBinCount: 512,
    context: { sampleRate: 48_000 },
    getFloatFrequencyData: spectrum,
  } as unknown as AnalyserNode
  return { analyser, spectrum }
}

function captureFrames() {
  const frames: FrameRequestCallback[] = []
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback)
    return frames.length
  })
  const cancel = vi
    .spyOn(window, 'cancelAnimationFrame')
    .mockImplementation(() => undefined)
  return { frames, cancel }
}

function levels(container: HTMLElement): number[] {
  return [...container.querySelectorAll('span')].map((bar) => {
    const inset = /inset\(([\d.]+)%/.exec(bar.style.clipPath)?.[1]
    return 1 - Number(inset) / 100
  })
}

function expectLevels(container: HTMLElement, expected: readonly number[]) {
  const actual = levels(container)
  expect(actual).toHaveLength(expected.length)
  actual.forEach((level, i) => {
    expect(level).toBeCloseTo(expected[i] ?? Number.NaN, 2)
  })
}

function filled(level: number): number[] {
  return Array.from({ length: BAR_COUNT }, () => level)
}

function matchOnly(target: string) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query === target,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

describe('bandEdges', () => {
  it.each([
    [512, 48_000],
    [512, 44_100],
    [1024, 48_000],
  ])('splits %i bins at %i Hz into contiguous, non-empty bands', (bins, rate) => {
    const edges = bandEdges(bins, rate)
    expect(edges).toHaveLength(BAR_COUNT)
    edges.forEach(([from, to], i) => {
      expect(from).toBeGreaterThanOrEqual(1)
      expect(to).toBeGreaterThan(from)
      expect(to).toBeLessThanOrEqual(bins)
      if (i > 0) expect(from).toBe(edges[i - 1]?.[1])
    })
  })

  it('keeps every band inside the bins when there are too few to spread out', () => {
    const edges = bandEdges(8, 48_000)
    expect(edges).toHaveLength(BAR_COUNT)
    edges.forEach(([from, to]) => {
      expect(from).toBeGreaterThanOrEqual(1)
      expect(to).toBeGreaterThan(from)
      expect(to).toBeLessThanOrEqual(8)
    })
  })
})

describe('levels', () => {
  it('averages the decibels of a band', () => {
    expect(bandDecibels(Float32Array.from([0, -60, -40, -99]), [1, 3])).toBe(-50)
  })

  it('sits at the center on the running mean and swings with the music', () => {
    expect(levelAround(-50, -50)).toBe(CENTER)
    expect(levelAround(-50 + SWING_DB / 4, -50)).toBeCloseTo(CENTER + 0.25)
    expect(levelAround(-50 + SWING_DB * 2, -50)).toBe(1)
    expect(levelAround(-50 - SWING_DB * 2, -50)).toBe(FLOOR)
  })
})

describe('Equalizer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    window.localStorage.clear()
    delete document.documentElement.dataset.motion
  })

  it('renders a hidden strip of bars at rest', () => {
    captureFrames()
    const { container } = render(<Equalizer state="idle" analyser={null} />)
    const strip = container.firstElementChild
    expect(strip).toHaveAttribute('aria-hidden', 'true')
    expect(strip).toHaveAttribute('data-state', 'idle')
    expect(container.querySelectorAll('span')).toHaveLength(BAR_COUNT)
    expect(strip?.textContent).toBe('')
    expectLevels(container, REST)
  })

  it('breathes while waiting for the music', () => {
    const { frames } = captureFrames()
    const { container } = render(<Equalizer state="idle" analyser={null} />)
    act(() => {
      frames.at(-1)?.(600)
    })
    const breathing = levels(container)
    expect(breathing.some((level, i) => Math.abs(level - (REST[i] ?? 0)) > 0.01)).toBe(
      true,
    )
    breathing.forEach((level, i) => {
      expect(level).toBeLessThanOrEqual((REST[i] ?? 1) + 0.001)
    })
  })

  it('drives the bars from the analyser while playing', () => {
    let decibels = -60
    const { analyser, spectrum } = fakeAnalyser((data) => data.fill(decibels))
    const { frames } = captureFrames()
    const { container } = render(<Equalizer state="playing" analyser={analyser} />)
    act(() => {
      frames.at(-1)?.(0)
    })
    expectLevels(container, filled(CENTER))
    decibels = -60 + SWING_DB / 2
    act(() => {
      frames.at(-1)?.(16)
    })
    expectLevels(container, filled(1))
    expect(spectrum).toHaveBeenCalledTimes(2)
  })

  it('drops the bars to the floor on silence', () => {
    const { analyser } = fakeAnalyser((data) => data.fill(-Infinity))
    const { frames } = captureFrames()
    const { container } = render(<Equalizer state="playing" analyser={analyser} />)
    act(() => {
      frames.at(-1)?.(0)
    })
    expectLevels(container, filled(FLOOR))
  })

  it('lays the bars flat and stops drawing when muted', () => {
    const { analyser } = fakeAnalyser((data) => data.fill(-40))
    const { frames, cancel } = captureFrames()
    const { container, rerender } = render(
      <Equalizer state="playing" analyser={analyser} />,
    )
    rerender(<Equalizer state="muted" analyser={analyser} />)
    expect(cancel).toHaveBeenCalled()
    expect(frames).toHaveLength(1)
    expectLevels(container, filled(FLOOR))
    expect(container.firstElementChild).toHaveAttribute('data-state', 'muted')
  })

  it('keeps the bars still when the visitor prefers reduced motion', () => {
    matchOnly('(prefers-reduced-motion: reduce)')
    const { analyser } = fakeAnalyser((data) => data.fill(-40))
    const { frames } = captureFrames()
    const { container } = render(<Equalizer state="playing" analyser={analyser} />)
    expect(frames).toHaveLength(0)
    expectLevels(container, REST)
  })

  it('stops drawing at the widths where the strip is hidden', () => {
    matchOnly(HIDDEN_WIDTHS)
    const { analyser, spectrum } = fakeAnalyser((data) => data.fill(-40))
    const { frames } = captureFrames()
    render(<Equalizer state="playing" analyser={analyser} />)
    expect(frames).toHaveLength(0)
    expect(spectrum).not.toHaveBeenCalled()
  })

  it('keeps the bars still while motion is paused on the site', () => {
    window.localStorage.setItem(MOTION_STORAGE_KEY, 'paused')
    document.documentElement.dataset.motion = 'paused'
    const { frames } = captureFrames()
    const { container } = render(
      <MotionPauseProvider>
        <Equalizer state="idle" analyser={null} />
      </MotionPauseProvider>,
    )
    expect(frames).toHaveLength(0)
    expectLevels(container, REST)
  })
})
