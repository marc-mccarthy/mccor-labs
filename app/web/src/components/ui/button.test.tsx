import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './button'

function classesOf(name: string): string[] {
  return screen.getByRole('button', { name }).className.split(/\s+/)
}

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

  it('keeps both the accent-fill label colour and the base font size on primary', () => {
    render(<Button>Primary</Button>)
    const classes = classesOf('Primary')
    expect(classes).toContain('bg-accent')
    expect(classes).toContain('text-on-accent')
    expect(classes).toContain('text-sm')
  })

  it('keeps the accent-fill label colour when lg bumps the font size', () => {
    render(<Button size="lg">Large</Button>)
    const classes = classesOf('Large')
    expect(classes).toContain('text-on-accent')
    expect(classes).toContain('text-[1rem]')
    expect(classes).not.toContain('text-sm')
  })

  it('keeps the link variant its own colour at the lg size', () => {
    render(
      <Button variant="link" size="lg">
        Read more
      </Button>,
    )
    const classes = classesOf('Read more')
    expect(classes).toContain('text-accent')
    expect(classes).toContain('text-[1rem]')
  })

  it('defaults to the primary variant at the md size', () => {
    render(<Button>Default</Button>)
    const classes = classesOf('Default')
    expect(classes).toContain('bg-accent')
    expect(classes).toContain('h-11')
    expect(classes).toContain('px-6')
  })

  it('gives hover feedback within the pointer duration', () => {
    render(<Button>Timed</Button>)
    const classes = classesOf('Timed')
    expect(classes).toContain('duration-(--duration-pointer)')
    expect(classes).toContain('ease-(--ease-pointer)')
  })
})
