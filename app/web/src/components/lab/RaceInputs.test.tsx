import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { labLive } from '@/content/lab/copy'
import type { RaceExample } from '@/lib/lab'
import { MAX_EXAMPLES, MIN_EXAMPLES, RaceInputs, isRaceReady } from './RaceInputs'

const FILLED: RaceExample = { input: 'Invoice from Acme', expected: 'billing' }
const EMPTY: RaceExample = { input: '', expected: '' }

function make(count: number, base: RaceExample = EMPTY): RaceExample[] {
  return Array.from({ length: count }, () => ({ ...base }))
}

describe('RaceInputs', () => {
  it('labels every field and caps their lengths', () => {
    render(<RaceInputs examples={make(2)} onChange={vi.fn()} />)
    for (const n of [1, 2]) {
      const input = screen.getByLabelText(labLive.exampleInputLabel(n))
      expect(input.tagName).toBe('TEXTAREA')
      expect(input).toHaveAttribute('maxlength', '500')
      const expected = screen.getByLabelText(labLive.exampleExpectedLabel(n))
      expect(expected.tagName).toBe('INPUT')
      expect(expected).toHaveAttribute('maxlength', '40')
    }
  })

  it('announces the notice on every field through aria-describedby', () => {
    render(<RaceInputs examples={make(3)} onChange={vi.fn()} />)
    const fields = [
      ...screen.getAllByLabelText(/^Example \d$/),
      ...screen.getAllByLabelText(/^Right answer for example \d$/),
    ]
    expect(fields).toHaveLength(6)
    for (const field of fields) {
      expect(field).toHaveAccessibleDescription(labLive.inputNotice)
    }
  })

  it('gives the fields a 44 px minimum height and the strong border', () => {
    render(<RaceInputs examples={make(2)} onChange={vi.fn()} />)
    for (const field of screen.getAllByRole('textbox')) {
      expect(field).toHaveClass('min-h-11', 'border-border-strong')
    }
  })

  it('adds an empty example', async () => {
    const onChange = vi.fn()
    render(<RaceInputs examples={[FILLED, FILLED]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: labLive.addExample }))
    expect(onChange).toHaveBeenCalledWith([FILLED, FILLED, EMPTY])
  })

  it('stops adding at 5 with a described aria-disabled button', async () => {
    const onChange = vi.fn()
    render(<RaceInputs examples={make(MAX_EXAMPLES)} onChange={onChange} />)
    const add = screen.getByRole('button', { name: labLive.addExample })
    expect(add).toHaveAttribute('aria-disabled', 'true')
    expect(add).toHaveAccessibleDescription(labLive.upToExamples)
    await userEvent.click(add)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('leaves the add button enabled and undescribed below the limit', () => {
    render(<RaceInputs examples={make(4)} onChange={vi.fn()} />)
    const add = screen.getByRole('button', { name: labLive.addExample })
    expect(add).not.toHaveAttribute('aria-disabled')
    expect(add).not.toHaveAttribute('aria-describedby')
  })

  it('hides Remove at 2 examples and shows it above', () => {
    const { rerender } = render(
      <RaceInputs examples={make(MIN_EXAMPLES)} onChange={vi.fn()} />,
    )
    expect(screen.queryByRole('button', { name: /^Remove example/ })).toBeNull()
    rerender(<RaceInputs examples={make(3)} onChange={vi.fn()} />)
    expect(screen.getAllByRole('button', { name: /^Remove example/ })).toHaveLength(3)
  })

  it('removes the chosen example', async () => {
    const onChange = vi.fn()
    const second: RaceExample = { input: 'Where is my parcel', expected: 'shipping' }
    render(<RaceInputs examples={[FILLED, second, EMPTY]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: labLive.removeExample(2) }))
    expect(onChange).toHaveBeenCalledWith([FILLED, EMPTY])
  })

  it('reports edits to one field and keeps the rest', async () => {
    const onChange = vi.fn()
    render(<RaceInputs examples={[EMPTY, FILLED]} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText(labLive.exampleExpectedLabel(1)), 'x')
    expect(onChange).toHaveBeenCalledWith([{ input: '', expected: 'x' }, FILLED])
  })

  it('gives every button the md height', () => {
    render(<RaceInputs examples={make(3)} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(4)
    for (const button of buttons) {
      expect(button).toHaveClass('h-11')
    }
  })
})

describe('isRaceReady', () => {
  it('is false with an empty field', () => {
    expect(isRaceReady([FILLED, { input: 'Parcel late', expected: '' }])).toBe(false)
    expect(isRaceReady([FILLED, FILLED, EMPTY])).toBe(false)
  })

  it('is false with a whitespace-only field', () => {
    expect(isRaceReady([FILLED, { input: '   ', expected: 'shipping' }])).toBe(false)
  })

  it('is false with one filled example', () => {
    expect(isRaceReady([FILLED])).toBe(false)
    expect(isRaceReady([FILLED, EMPTY])).toBe(false)
  })

  it('is true with two filled examples', () => {
    expect(isRaceReady([FILLED, FILLED])).toBe(true)
  })
})
