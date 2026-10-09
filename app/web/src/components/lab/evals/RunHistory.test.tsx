import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { EvalTrace } from '@/content/lab/evals'
import { evalsCopy } from '@/content/lab/evalsCopy'

import { RunHistory } from './RunHistory'

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
    rubricVersion: '2.0.0',
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

const traces: EvalTrace[] = [
  trace({ runId: 'newest', date: '2026-10-09' }),
  trace({
    runId: 'staged',
    date: '2026-10-08',
    startedAt: '2026-10-08T14:00:00.000Z',
    staged: true,
    pass: false,
    runUrl: 'https://github.com/example/repo/actions/runs/2',
    rubric: { passed: 9, failed: 1 },
    totals: {
      cases: 20,
      passed: 19,
      failed: 1,
      inputTokens: 200,
      outputTokens: 40,
      costUsd: 0.00009,
    },
  }),
  trace({
    runId: 'failed',
    date: '2026-10-07',
    startedAt: '2026-10-07T14:00:00.000Z',
    pass: false,
    runUrl: null,
  }),
]

const CASES = 1
const RUBRIC = 2
const COST = 3

function bodyRows(): HTMLElement[] {
  return within(screen.getByRole('table')).getAllByRole('row').slice(1)
}

function row(index: number): HTMLElement {
  const found = bodyRows()[index]
  if (!found) throw new Error(`no row ${String(index)}`)
  return found
}

function cell(rowIndex: number, colIndex: number): HTMLElement {
  const found = within(row(rowIndex)).getAllByRole('cell')[colIndex]
  if (!found) throw new Error(`no cell ${String(rowIndex)},${String(colIndex)}`)
  return found
}

describe('RunHistory', () => {
  it('renders nothing for no traces', () => {
    const { container } = render(<RunHistory traces={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a captioned table under its heading', () => {
    render(<RunHistory traces={traces} />)
    expect(
      screen.getByRole('heading', { level: 2, name: evalsCopy.historyHeading }),
    ).toBeInTheDocument()
    const table = screen.getByRole('table', { name: evalsCopy.historyCaption })
    for (const name of Object.values(evalsCopy.columns)) {
      expect(within(table).getByRole('columnheader', { name })).toHaveAttribute(
        'scope',
        'col',
      )
    }
  })

  it('keeps the given row order and reads each result as text', () => {
    render(<RunHistory traces={traces} />)
    expect(bodyRows()).toHaveLength(3)
    expect(row(0)).toHaveTextContent('2026-10-09')
    expect(row(1)).toHaveTextContent('2026-10-08')
    expect(row(2)).toHaveTextContent('2026-10-07')
    expect(within(row(0)).getByRole('cell', { name: 'passed' })).toBeInTheDocument()
    expect(
      within(row(1)).getByRole('cell', { name: 'failed (staged)' }),
    ).toBeInTheDocument()
    expect(within(row(2)).getByRole('cell', { name: 'failed' })).toBeInTheDocument()
  })

  it('reads cases and rubric as passed over total', () => {
    render(<RunHistory traces={traces} />)
    expect(cell(1, CASES)).toHaveTextContent('19/20')
    expect(cell(1, RUBRIC)).toHaveTextContent('9/10')
  })

  it('reads the cost as value then a muted unit', () => {
    render(<RunHistory traces={traces} />)
    expect(cell(0, COST)).toHaveTextContent('0.0034 USD')
    expect(cell(0, COST).querySelector('span.text-muted')).toHaveTextContent('USD')
    expect(cell(1, COST)).toHaveTextContent('under 0.0001 USD')
    expect(cell(1, COST).querySelector('span.text-muted')).toHaveTextContent('USD')
  })

  it('aligns the number columns', () => {
    render(<RunHistory traces={traces} />)
    const columns = { Cases: CASES, Rubric: RUBRIC, Cost: COST }
    for (const [name, index] of Object.entries(columns)) {
      expect(screen.getByRole('columnheader', { name })).toHaveClass(
        'font-mono',
        'tabular-nums',
        'text-right',
      )
      for (let r = 0; r < traces.length; r += 1) {
        expect(cell(r, index)).toHaveClass('font-mono', 'tabular-nums', 'text-right')
      }
    }
  })

  it('wraps the table in a labelled, focusable scroll region', () => {
    render(<RunHistory traces={traces} />)
    const region = screen.getByRole('region', { name: evalsCopy.historyScrollLabel })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(within(region).getByRole('table')).toBeInTheDocument()
  })

  it('links the log only for runs with a run URL', () => {
    render(<RunHistory traces={traces} />)
    const links = screen.getAllByRole('link', { name: evalsCopy.runLog })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute(
      'href',
      'https://github.com/example/repo/actions/runs/1',
    )
    expect(links[1]).toHaveAttribute(
      'href',
      'https://github.com/example/repo/actions/runs/2',
    )
  })

  it('uses no color values', () => {
    const { container } = render(<RunHistory traces={traces} />)
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|oklch\(/i)
  })
})
