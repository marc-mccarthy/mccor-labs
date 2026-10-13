import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { sendCopy } from '@/content/lab/copy'
import { EMPTY_ANSWERS, classifyStep } from '@/content/lab/rubric'
import { decodeLabResult, formatLabResult } from '@/lib/labResult'
import { SendResult } from './SendResult'

const steps = [
  { name: 'Send invoices', result: classifyStep(EMPTY_ANSWERS), answers: EMPTY_ANSWERS },
]

function sentResult() {
  const href =
    screen.getByRole('link', { name: sendCopy.button }).getAttribute('href') ?? ''
  expect(href.startsWith('/contact/#lab=')).toBe(true)
  return decodeLabResult(href.slice('/contact/#lab='.length))
}

describe('SendResult', () => {
  it('leaves step names out by default and previews the exact text', () => {
    render(<SendResult steps={steps} />)
    expect(
      screen.getByRole('checkbox', { name: sendCopy.includeNames }),
    ).not.toBeChecked()
    expect(screen.queryByText(/Send invoices/)).not.toBeInTheDocument()
    expect(formatLabResult(sentResult()!)).toBe(
      document.querySelector('pre')?.textContent,
    )
  })

  it('adds the names to the preview and the link when ticked', async () => {
    render(<SendResult steps={steps} />)
    await userEvent.click(screen.getByRole('checkbox', { name: sendCopy.includeNames }))
    expect(document.querySelector('pre')).toHaveTextContent('Step 1, Send invoices')
    expect(sentResult()?.steps[0]?.name).toBe('Send invoices')
  })

  it('captions the preview with a figure label', () => {
    render(<SendResult steps={steps} />)
    const figure = screen.getByRole('figure')
    expect(figure.querySelector('figcaption')).toHaveTextContent(sendCopy.previewLabel)
    expect(figure.querySelector('pre')).toBe(document.querySelector('pre'))
    expect(document.querySelector('pre')).not.toHaveAttribute('aria-labelledby')
  })
})
