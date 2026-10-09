import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { signOffCopy, summaryCopy, verdictCopy } from '@/content/lab/copy'
import { EMPTY_ANSWERS, classifyStep } from '@/content/lab/rubric'
import { SummaryTable } from './SummaryTable'

const rows = [
  {
    position: 1,
    name: 'Send invoices',
    result: classifyStep({
      ...EMPTY_ANSWERS,
      costly: 'no',
      fixedForm: 'yes',
      checklist: 'yes',
      changes: 'no',
    }),
  },
  { position: 2, name: '', result: classifyStep(EMPTY_ANSWERS) },
]

describe('SummaryTable', () => {
  it('opens as a captioned table with one row per step', () => {
    render(<SummaryTable rows={rows} />)
    const table = screen.getByRole('table', { name: summaryCopy.caption })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByText(verdictCopy['plain-code'].label)).toBeInTheDocument()
    expect(within(table).getByText('R7')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: summaryCopy.table })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('wraps the table in a labelled, focusable scroll region', () => {
    render(<SummaryTable rows={rows} />)
    expect(screen.getByRole('region', { name: summaryCopy.scrollLabel })).toHaveAttribute(
      'tabindex',
      '0',
    )
  })

  it('switches to cards for any visitor', async () => {
    render(<SummaryTable rows={rows} />)
    await userEvent.click(screen.getByRole('button', { name: summaryCopy.cards }))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('button', { name: summaryCopy.cards })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('shows the sign-off beside the verdict only when a person must check', () => {
    const signed = classifyStep({
      ...EMPTY_ANSWERS,
      fixedForm: 'yes',
      checklist: 'yes',
      changes: 'no',
      costly: 'yes',
      checkable: 'yes',
    })
    render(<SummaryTable rows={[{ position: 1, name: 'Refunds', result: signed }]} />)
    expect(screen.getByText(signOffCopy)).toBeInTheDocument()
  })

  it('sizes both toggles to at least 44 by 44 px', () => {
    render(<SummaryTable rows={rows} />)
    for (const name of [summaryCopy.table, summaryCopy.cards]) {
      expect(screen.getByRole('button', { name })).toHaveClass('h-11', 'min-w-11')
    }
  })
})
