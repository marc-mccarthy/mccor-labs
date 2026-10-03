import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CodeBlock } from './CodeBlock'

describe('CodeBlock', () => {
  it('renders its filename when given one', async () => {
    render(
      await CodeBlock({
        code: 'const x = 1',
        lang: 'typescript',
        filename: 'example.ts',
      }),
    )
    expect(screen.getByText('example.ts')).toBeInTheDocument()
  })

  it('renders no filename header when none is given', async () => {
    const { container } = render(
      await CodeBlock({ code: 'const x = 1', lang: 'typescript' }),
    )
    expect(container.querySelector('p')).toBeNull()
  })

  it('renders real highlighted markup, not an escaped string', async () => {
    const { container } = render(
      await CodeBlock({ code: 'const x = 1', lang: 'typescript' }),
    )
    expect(container.querySelector('pre')).not.toBeNull()
  })
})
