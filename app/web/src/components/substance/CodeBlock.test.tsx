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

  it('makes the scroll area a labelled, focusable region when asked', async () => {
    render(
      await CodeBlock({
        code: 'const x = 1',
        lang: 'typescript',
        scrollLabel: 'Rule R1 as code',
      }),
    )
    const region = screen.getByRole('region', { name: 'Rule R1 as code' })
    expect(region).toHaveAttribute('tabindex', '0')
  })

  it('adds no region without a label', async () => {
    render(await CodeBlock({ code: 'const x = 1', lang: 'typescript' }))
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })
})
