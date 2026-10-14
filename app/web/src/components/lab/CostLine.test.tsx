import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { labLive } from '@/content/lab/copy'
import { CostLine } from './CostLine'

describe('CostLine', () => {
  it('shows the cost, monthly line, price note and runs left for a live run', () => {
    const { container } = render(
      <CostLine
        costUsd={0.00338}
        examples={5}
        frequency="daily"
        pricesAsOf="2026-10-09"
        runsLeft={12}
        recorded={false}
      />,
    )
    expect(screen.getByText(labLive.costOfRun, { exact: false })).toBeInTheDocument()
    expect(screen.getByText(/^If this runs once a day,/)).toBeInTheDocument()
    expect(screen.getByText(labLive.priceNote('2026-10-09'))).toHaveClass('text-muted')
    expect(screen.getByText(labLive.runsLeft(12))).toBeInTheDocument()
    expect(container).toHaveTextContent('0.0034 USD')
  })

  it('labels a recorded run and drops the runs-left line', () => {
    render(<CostLine costUsd={0.002} pricesAsOf="2026-10-09" runsLeft={3} recorded />)
    expect(screen.getByText(labLive.recordedCost, { exact: false })).toBeInTheDocument()
    expect(screen.queryByText(labLive.costOfRun, { exact: false })).toBeNull()
    expect(screen.queryByText(/live runs left today/)).toBeNull()
  })

  it('renders a tiny cost as under 0.0001 in a mono span with a muted unit', () => {
    render(<CostLine costUsd={0.00005} pricesAsOf="2026-10-09" recorded={false} />)
    const value = screen.getByText('under 0.0001')
    expect(value).toHaveClass('font-mono', 'tabular-nums')
    expect(value).not.toHaveClass('text-right')
    const unit = screen.getByText('USD')
    expect(unit.tagName).toBe('SPAN')
    expect(unit).toHaveClass('text-muted')
    expect(unit).not.toHaveClass('text-right')
    expect(value.nextSibling?.textContent).toBe(' ')
  })

  it('omits the monthly line without a frequency', () => {
    render(
      <CostLine costUsd={0.002} examples={5} pricesAsOf="2026-10-09" recorded={false} />,
    )
    expect(screen.queryByText(/If this runs/)).toBeNull()
  })

  it('omits the monthly line when the frequency is null', () => {
    render(
      <CostLine
        costUsd={0.002}
        examples={5}
        frequency={null}
        pricesAsOf="2026-10-09"
        recorded={false}
      />,
    )
    expect(screen.queryByText(/If this runs/)).toBeNull()
  })

  it('pins the projected sentence for 0.002 USD over 5 examples, daily', () => {
    render(
      <CostLine
        costUsd={0.002}
        examples={5}
        frequency="daily"
        pricesAsOf="2026-10-09"
        recorded={false}
      />,
    )
    expect(screen.getByText(/^If this runs once a day,/).textContent).toBe(
      'If this runs once a day, one item each time: about 0.02 USD a month for the model, against about 0 USD for a simple program',
    )
  })

  it('says less than 0.0001 and never "about under" for a tiny projection', () => {
    const { container } = render(
      <CostLine
        costUsd={0.000001}
        examples={1}
        frequency="daily"
        pricesAsOf="2026-10-09"
        recorded={false}
      />,
    )
    expect(container.textContent).not.toContain('about under')
    expect(screen.getByText(/^If this runs once a day,/).textContent).toBe(
      labLive.monthlyUnderFloor('daily'),
    )
  })

  it('says about 0 for a zero cost and never "about under"', () => {
    const { container } = render(
      <CostLine
        costUsd={0}
        examples={1}
        frequency="daily"
        pricesAsOf="2026-10-09"
        recorded={false}
      />,
    )
    expect(container.textContent).not.toContain('about under')
    expect(container).toHaveTextContent('Cost of This Run 0 USD')
    expect(screen.getByText(/^If this runs once a day,/)).toHaveTextContent(
      'about 0 USD a month for the model',
    )
  })

  it('writes the monthly line in USD only', () => {
    render(
      <CostLine
        costUsd={0.002}
        examples={5}
        frequency="daily"
        pricesAsOf="2026-10-09"
        recorded={false}
      />,
    )
    const line = screen.getByText(/^If this runs once a day,/)
    expect(line).toHaveTextContent('USD a month')
    expect(line.textContent).not.toContain('USD USD')
    expect(line.textContent).not.toContain('$')
  })

  it('shows zero runs left', () => {
    render(
      <CostLine costUsd={0.002} pricesAsOf="2026-10-09" runsLeft={0} recorded={false} />,
    )
    expect(screen.getByText('0 live runs left today')).toBeInTheDocument()
  })

  it('draws no bar, meter or progress element', () => {
    const { container } = render(
      <CostLine costUsd={0.002} pricesAsOf="2026-10-09" runsLeft={4} recorded={false} />,
    )
    expect(container.querySelector('progress, meter, [role="progressbar"]')).toBeNull()
  })
})
