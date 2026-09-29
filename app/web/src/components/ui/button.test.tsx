import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button, buttonVariants } from './button'

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

  it('gives lg a font-size bump, not the text-base colour utility', () => {
    // variant: 'link' has no text-base of its own, so this isolates the size
    // fix from primary's deliberate (and separately pinned) colour use below.
    const classes = buttonVariants({ variant: 'link', size: 'lg' })
    expect(classes).toContain('text-[1rem]')
    expect(classes).not.toContain('text-base')
  })

  it('keeps text-base as the deliberate colour pairing on the primary variant', () => {
    expect(buttonVariants({ variant: 'primary' })).toContain('text-base')
  })

  it('defaults to the primary variant at the md size', () => {
    const classes = buttonVariants()
    expect(classes).toContain('bg-accent')
    expect(classes).toContain('h-11 px-6')
  })
})
