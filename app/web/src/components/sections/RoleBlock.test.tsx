import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RoleBlock } from './RoleBlock'
import { roles } from '@/content/careers'

describe('RoleBlock', () => {
  it('renders the role title through SectionHeading', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    const role = roles[0]!
    render(<RoleBlock role={role} />)
    const heading = screen.getByRole('heading', { level: 2, name: role.title })
    expect(heading.parentElement).toHaveAttribute('data-reveal')
  })
})
