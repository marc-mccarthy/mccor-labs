import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { splitWords } from './splitWords'

describe('splitWords', () => {
  it('preserves the original text and wraps each word', () => {
    const { container } = render(<p>{splitWords('alpha  beta gamma')}</p>)
    expect(container.textContent).toBe('alpha  beta gamma')
    const words = container.querySelectorAll<HTMLElement>('[data-word]')
    expect(words).toHaveLength(3)
    expect(words[2]?.style.getPropertyValue('--i')).toBe('2')
    expect(words[0]?.parentElement).toHaveClass('overflow-clip')
  })
})
