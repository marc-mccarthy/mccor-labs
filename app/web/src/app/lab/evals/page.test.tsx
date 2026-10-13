import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EvalTrace } from '@/content/lab/evals'
import { evalsCopy } from '@/content/lab/evalsCopy'
import { RUBRIC_VERSION } from '@/content/lab/rubric'

const loadTraces = vi.hoisted(() => vi.fn<(dir: string) => EvalTrace[]>())

vi.mock('@/content/lab/evals', () => ({
  TRACE_DIR: '/traces',
  loadTraces,
}))

import EvalsPage, { metadata } from './page'

function trace(overrides: Partial<EvalTrace> = {}): EvalTrace {
  return {
    schema: 1,
    runId: 'run-1',
    date: '2026-10-09',
    startedAt: '2026-10-09T14:00:00.000Z',
    staged: false,
    stagedCaseIds: [],
    runUrl: 'https://github.com/example/repo/actions/runs/1',
    modelId: 'model-1',
    rubricVersion: '0.0.1',
    rubric: { passed: 10, failed: 0 },
    cases: [],
    totals: {
      cases: 20,
      passed: 20,
      failed: 0,
      inputTokens: 200,
      outputTokens: 40,
      costUsd: 0.00338,
    },
    pass: true,
    ...overrides,
  }
}

function sectionOf(heading: string): HTMLElement {
  const section = screen.getByRole('heading', { name: heading }).closest('section')
  if (!section) throw new Error(`no section for ${heading}`)
  return section
}

describe('EvalsPage', () => {
  beforeEach(() => {
    loadTraces.mockReset()
  })

  it('renders one h1 and the sections in order', () => {
    loadTraces.mockReturnValue([
      trace({
        runId: 'staged',
        staged: true,
        pass: false,
        totals: { ...trace().totals, passed: 19, failed: 1 },
      }),
      trace({
        runId: 'older',
        date: '2026-10-08',
        startedAt: '2026-10-08T14:00:00.000Z',
      }),
    ])
    render(<EvalsPage />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      screen.getByRole('heading', { level: 1, name: evalsCopy.title }),
    ).toBeInTheDocument()
    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent)
    expect(headings).toEqual([
      evalsCopy.latestHeading,
      evalsCopy.historyHeading,
      evalsCopy.methodHeading,
    ])
    expect(loadTraces).toHaveBeenCalledWith('/traces')
  })

  it('shows the latest run first and the word staged', () => {
    loadTraces.mockReturnValue([
      trace({ runId: 'staged', staged: true, pass: false }),
      trace({ runId: 'older', date: '2026-10-08' }),
    ])
    render(<EvalsPage />)
    const latest = sectionOf(evalsCopy.latestHeading)
    expect(within(latest).getByText(evalsCopy.staged)).toBeInTheDocument()
    expect(within(latest).getByText(evalsCopy.failed)).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('shows the method note and the rubric version in mono', () => {
    loadTraces.mockReturnValue([trace()])
    render(<EvalsPage />)
    const method = sectionOf(evalsCopy.methodHeading)
    expect(
      within(method).getByText(
        'A staged run is a real model run where we swapped one right answer on purpose, to show what a failed run looks like.',
      ),
    ).toBeInTheDocument()
    for (const paragraph of evalsCopy.method) {
      expect(within(method).getByText(paragraph)).toBeInTheDocument()
    }
    const version = within(method).getByText(`Rubric version ${RUBRIC_VERSION}`)
    expect(version).toHaveClass('font-mono')
  })

  it('shows the empty text and no table when there are no runs', () => {
    loadTraces.mockReturnValue([])
    render(<EvalsPage />)
    expect(screen.getByText(evalsCopy.empty)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: evalsCopy.historyHeading }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: evalsCopy.methodHeading }),
    ).toBeInTheDocument()
  })

  it('sets the metadata from the copy', () => {
    expect(metadata.title).toBe(evalsCopy.title)
    expect(metadata.description).toBe(evalsCopy.description)
  })
})
