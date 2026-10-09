import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { EMPTY_ANSWERS, classifyStep } from '@/content/lab/rubric'
import { encodeLabResult, toLabResult } from '@/lib/labResult'
import { useLabPrefill } from './useLabPrefill'

function Probe() {
  return <p data-testid="prefill">{useLabPrefill() ?? 'none'}</p>
}

const encoded = encodeLabResult(
  toLabResult(
    [{ name: 'A', result: classifyStep(EMPTY_ANSWERS), answers: EMPTY_ANSWERS }],
    false,
  ),
)

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('useLabPrefill', () => {
  it('reads a lab fragment, formats it, and clears the hash', () => {
    window.history.replaceState(null, '', `/contact/#lab=${encoded}`)
    render(<Probe />)
    expect(screen.getByTestId('prefill')).toHaveTextContent('Step 1: not answered yet')
    expect(window.location.hash).toBe('')
    expect(window.location.pathname).toBe('/contact/')
  })

  it('ignores a malformed fragment but still clears it', () => {
    window.history.replaceState(null, '', '/contact/#lab=garbage')
    render(<Probe />)
    expect(screen.getByTestId('prefill')).toHaveTextContent('none')
    expect(window.location.hash).toBe('')
  })

  it('leaves other fragments alone', () => {
    window.history.replaceState(null, '', '/contact/#top')
    render(<Probe />)
    expect(screen.getByTestId('prefill')).toHaveTextContent('none')
    expect(window.location.hash).toBe('#top')
  })
})
