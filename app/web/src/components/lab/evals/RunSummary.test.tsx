import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { EvalTrace, TraceCase } from '@/content/lab/evals'
import { evalsCopy } from '@/content/lab/evalsCopy'

import { RunSummary } from './RunSummary'

function passingCase(id: string): TraceCase {
  return {
    id,
    kind: 'race',
    pass: true,
    code: { pass: true, checks: [{ name: 'accuracy', pass: true, detail: '3 of 3' }] },
    judge: null,
    output: 'a, b, c',
    inputTokens: 100,
    outputTokens: 20,
    guardrailTextUnits: 1,
    latencyMs: 400,
    costUsd: 0.0001,
  }
}

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
    cases: [passingCase('race-one'), passingCase('race-two')],
    totals: {
      cases: 2,
      passed: 2,
      failed: 0,
      inputTokens: 200,
      outputTokens: 40,
      costUsd: 0.00338,
    },
    pass: true,
    ...overrides,
  }
}

function failedTrace(overrides: Partial<EvalTrace> = {}): EvalTrace {
  const codeFail: TraceCase = {
    ...passingCase('race-bad'),
    pass: false,
    code: {
      pass: false,
      checks: [
        { name: 'format', pass: true, detail: 'ok' },
        { name: 'accuracy', pass: false, detail: '1 of 3 matched' },
        { name: 'length', pass: false, detail: 'too long' },
      ],
    },
  }
  const judgeFail: TraceCase = {
    ...passingCase('argue-bad'),
    kind: 'argue',
    pass: false,
    judge: { pass: false, reason: 'The reply ignored the verdict.' },
  }
  return trace({
    cases: [passingCase('race-one'), codeFail, judgeFail],
    totals: {
      cases: 3,
      passed: 1,
      failed: 2,
      inputTokens: 300,
      outputTokens: 60,
      costUsd: 0.00338,
    },
    rubric: { passed: 9, failed: 1 },
    pass: false,
    ...overrides,
  })
}

describe('RunSummary', () => {
  it('shows the empty text for no trace', () => {
    render(<RunSummary trace={null} />)
    expect(
      screen.getByRole('heading', { level: 2, name: evalsCopy.latestHeading }),
    ).toBeInTheDocument()
    expect(screen.getByText(evalsCopy.empty)).toBeInTheDocument()
  })

  it('reads a passed run as text with its counts, model, date and cost', () => {
    render(<RunSummary trace={trace()} />)
    expect(screen.getByText(evalsCopy.passed)).toBeInTheDocument()
    expect(screen.queryByText(evalsCopy.failed)).not.toBeInTheDocument()
    expect(screen.queryByText(evalsCopy.staged)).not.toBeInTheDocument()
    expect(screen.getByText('2 of 2 cases passed')).toBeInTheDocument()
    expect(screen.getByText('10 of 10 rubric tests passed')).toBeInTheDocument()
    expect(screen.getByText('Rubric version 2.0.0')).toBeInTheDocument()
    expect(screen.getByText('Model model-1')).toBeInTheDocument()
    expect(screen.getByText('2026-10-09')).toBeInTheDocument()
    expect(screen.queryByText(evalsCopy.failedCases)).not.toBeInTheDocument()
  })

  it('reads the cost as value then a muted unit', () => {
    render(<RunSummary trace={trace()} />)
    const cost = screen.getByText(evalsCopy.cost, { exact: false })
    expect(cost).toHaveTextContent('0.0034 USD')
    expect(cost.querySelector('span.font-mono.tabular-nums')).toHaveTextContent('0.0034')
    expect(cost.querySelector('span.text-muted')).toHaveTextContent('USD')
    expect(cost.querySelector('.text-right')).toBeNull()
  })

  it('reads a tiny cost as under 0.0001 USD', () => {
    render(
      <RunSummary trace={trace({ totals: { ...trace().totals, costUsd: 0.00009 } })} />,
    )
    const cost = screen.getByText(evalsCopy.cost, { exact: false })
    expect(cost).toHaveTextContent('under 0.0001 USD')
    expect(cost.querySelector('span.text-muted')).toHaveTextContent('USD')
  })

  it('lists failed cases with the first failed check or the judge reason', () => {
    render(<RunSummary trace={failedTrace()} />)
    expect(screen.getByText(evalsCopy.failed)).toBeInTheDocument()
    expect(screen.queryByText(evalsCopy.passed)).not.toBeInTheDocument()
    const list = screen.getByRole('list', { name: evalsCopy.failedCases })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('race-bad')
    expect(items[0]).toHaveTextContent('accuracy')
    expect(items[0]).toHaveTextContent('1 of 3 matched')
    expect(items[0]).not.toHaveTextContent('too long')
    expect(items[1]).toHaveTextContent('argue-bad')
    expect(items[1]).toHaveTextContent('The reply ignored the verdict.')
    expect(screen.getByText('1 of 3 cases passed')).toBeInTheDocument()
    expect(screen.getByText('9 of 10 rubric tests passed')).toBeInTheDocument()
  })

  it('marks a staged failed run with the word staged', () => {
    render(<RunSummary trace={failedTrace({ staged: true })} />)
    expect(screen.getByText(evalsCopy.staged)).toBeInTheDocument()
    expect(screen.getByText(evalsCopy.failed)).toBeInTheDocument()
  })

  it('links to the run log only when there is a run URL', () => {
    const { rerender } = render(<RunSummary trace={trace()} />)
    expect(screen.getByRole('link', { name: evalsCopy.runLog })).toHaveAttribute(
      'href',
      'https://github.com/example/repo/actions/runs/1',
    )
    rerender(<RunSummary trace={trace({ runUrl: null })} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders judge reason and check detail as plain text, never markup', () => {
    const hostile: TraceCase = {
      ...passingCase('argue-html'),
      kind: 'argue',
      pass: false,
      judge: {
        pass: false,
        reason: '<a href="https://evil.example">click</a> <b>bold</b>',
      },
    }
    const { container } = render(
      <RunSummary trace={trace({ cases: [hostile], runUrl: null, pass: false })} />,
    )
    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
    expect(container).toHaveTextContent('<a href="https://evil.example">click</a>')
  })

  it('uses no color values', () => {
    const { container } = render(<RunSummary trace={failedTrace({ staged: true })} />)
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|oklch\(/i)
  })
})
