import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IntegrationMarks } from './IntegrationMarks'

const MARKS = [
  { name: 'AWS', src: '/marks/aws.svg' },
  { name: 'Postgres', src: '/marks/postgres.svg' },
  { name: 'Next.js', src: '/marks/nextjs.svg' },
  { name: 'Anthropic', src: '/marks/anthropic.svg' },
  { name: 'OpenAI', src: '/marks/openai.svg' },
  { name: 'Terraform', src: '/marks/terraform.svg' },
]

describe('IntegrationMarks', () => {
  it('renders a visible heading framing the marks as tools', () => {
    render(<IntegrationMarks heading="Tools we build with" marks={MARKS} />)
    expect(screen.getByText(/tools we build with/i)).toBeInTheDocument()
  })

  it('gives every mark an accessible name', () => {
    render(<IntegrationMarks heading="Tools we build with" marks={MARKS} />)
    MARKS.forEach((mark) => {
      expect(screen.getByAltText(mark.name)).toBeInTheDocument()
    })
  })
})
