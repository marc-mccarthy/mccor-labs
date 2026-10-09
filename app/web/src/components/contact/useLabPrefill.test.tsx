import { act, render, screen } from '@testing-library/react'
import { useLayoutEffect } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { EMPTY_ANSWERS, classifyStep } from '@/content/lab/rubric'
import { encodeLabResult, toLabResult } from '@/lib/labResult'
import { useLabPrefill } from './useLabPrefill'

function Probe() {
  return <p data-testid="prefill">{useLabPrefill() ?? 'none'}</p>
}

function SetHashOnCommit({ hash }: { hash: string }) {
  useLayoutEffect(() => {
    window.history.pushState(null, '', `/contact/${hash}`)
  }, [hash])
  return null
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

  it('reads and clears a fragment present when server HTML hydrates', async () => {
    window.history.replaceState(null, '', `/contact/#lab=${encoded}`)
    const container = document.createElement('div')
    container.innerHTML = renderToString(<Probe />)
    document.body.appendChild(container)
    expect(container).toHaveTextContent('none')
    await act(async () => {
      render(<Probe />, { container, hydrate: true })
      await Promise.resolve()
    })
    expect(screen.getByTestId('prefill')).toHaveTextContent('Step 1: not answered yet')
    expect(window.location.hash).toBe('')
  })

  it('reads and clears a fragment the router sets during commit', () => {
    window.history.replaceState(null, '', '/lab/should-this-be-ai/')
    render(
      <>
        <Probe />
        <SetHashOnCommit hash={`#lab=${encoded}`} />
      </>,
    )
    expect(screen.getByTestId('prefill')).toHaveTextContent('Step 1: not answered yet')
    expect(window.location.hash).toBe('')
  })

  it('ignores a malformed fragment but still clears it', () => {
    window.history.replaceState(null, '', '/contact/#lab=garbage')
    render(<Probe />)
    expect(screen.getByTestId('prefill')).toHaveTextContent('none')
    expect(window.location.hash).toBe('')
  })

  it('reads and clears a fragment that arrives after mount', async () => {
    render(<Probe />)
    expect(screen.getByTestId('prefill')).toHaveTextContent('none')
    await act(async () => {
      window.location.hash = `lab=${encoded}`
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(screen.getByTestId('prefill')).toHaveTextContent('Step 1: not answered yet')
    expect(window.location.hash).toBe('')
  })

  it('clears a repeat of the same fragment', async () => {
    window.history.replaceState(null, '', `/contact/#lab=${encoded}`)
    render(<Probe />)
    expect(window.location.hash).toBe('')
    await act(async () => {
      window.location.hash = `lab=${encoded}`
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(screen.getByTestId('prefill')).toHaveTextContent('Step 1: not answered yet')
    expect(window.location.hash).toBe('')
  })

  it('leaves other fragments alone', () => {
    window.history.replaceState(null, '', '/contact/#top')
    render(<Probe />)
    expect(screen.getByTestId('prefill')).toHaveTextContent('none')
    expect(window.location.hash).toBe('#top')
  })
})
