import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ContactReceipt } from './ContactReceipt'
import { ui } from '@/content/ui'

describe('ContactReceipt', () => {
  it('renders the reference with a copy button', () => {
    render(<ContactReceipt reference="MC-7Q4K" />)
    expect(screen.getByText('MC-7Q4K')).toHaveAttribute('data-receipt-reference')
    expect(
      screen.getByRole('button', { name: ui.contactReceiptCopy }),
    ).toBeInTheDocument()
    expect(screen.queryByText(ui.contactReceiptNext)).not.toBeInTheDocument()
  })

  it('shows the next-step line and no copy button without a reference', () => {
    render(<ContactReceipt reference={null} />)
    expect(screen.getByText(ui.contactReceiptNext)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: ui.contactReceiptCopy })).toBeNull()
  })

  it('has no reset control', () => {
    render(<ContactReceipt reference="MC-7Q4K" />)
    expect(screen.queryByRole('button', { name: /another/i })).toBeNull()
  })

  it('takes focus on its heading when it mounts', () => {
    render(<ContactReceipt reference="MC-7Q4K" />)
    const heading = screen.getByRole('heading', { name: ui.contactReceiptHeading })
    expect(heading).toHaveAttribute('tabindex', '-1')
    expect(heading).toHaveFocus()
  })

  it('adds no live region of its own', () => {
    render(<ContactReceipt reference="MC-7Q4K" />)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
