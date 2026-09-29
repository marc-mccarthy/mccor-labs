import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Book a call</Button>)
    expect(screen.getByRole('button', { name: 'Book a call' })).toBeInTheDocument()
  })

  it('renders as a link when asChild is set, so CTAs can navigate', () => {
    render(
      <Button asChild>
        <a href="/contact/">Contact</a>
      </Button>,
    )
    const link = screen.getByRole('link', { name: 'Contact' })
    expect(link).toHaveAttribute('href', '/contact/')
  })

  it('exposes the disabled state to assistive technology', () => {
    render(<Button disabled>Sending</Button>)
    expect(screen.getByRole('button', { name: 'Sending' })).toBeDisabled()
  })
})
