import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IntegrationMarks } from './IntegrationMarks'

const TOOLS = ['AWS', 'Postgres', 'Next.js', 'Anthropic', 'OpenAI', 'Terraform']

describe('IntegrationMarks', () => {
  it('renders a visible heading framing the marks as tools', () => {
    render(<IntegrationMarks heading="Tools we build with" tools={TOOLS} />)
    expect(screen.getByText(/tools we build with/i)).toBeInTheDocument()
  })

  it('names every tool as text', () => {
    render(<IntegrationMarks heading="Tools we build with" tools={TOOLS} />)
    TOOLS.forEach((tool) => {
      expect(screen.getByText(tool)).toBeInTheDocument()
    })
  })

  it('renders no logo images', () => {
    const { container } = render(
      <IntegrationMarks heading="Tools we build with" tools={TOOLS} />,
    )
    expect(container.querySelector('img, svg')).toBeNull()
  })
})
