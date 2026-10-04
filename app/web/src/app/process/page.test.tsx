import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ProcessPage from './page'
import { ui } from '@/content/ui'

describe('ProcessPage', () => {
  it('places an h2 between the page h1 and the stage h3s', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    render(<ProcessPage />)
    expect(
      screen.getByRole('heading', { level: 2, name: ui.processStagesHeading }),
    ).toBeInTheDocument()
  })
})
