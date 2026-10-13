import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { labPageCopy, whyCopy } from '@/content/lab/copy'
import { RUBRIC_VERSION } from '@/content/lab/rubric'
import LabPage, { metadata } from './page'

describe('LabPage', () => {
  it('renders the header, the builder and the method note with the rubric version', async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    render(await LabPage())
    expect(
      screen.getByRole('heading', { level: 1, name: labPageCopy.title }),
    ).toBeInTheDocument()
    expect(screen.getByText(`Rubric version ${RUBRIC_VERSION}`)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: labPageCopy.evalsLink })).toHaveAttribute(
      'href',
      '/lab/evals/',
    )
    expect(screen.getByTestId('header-image')).toHaveAttribute(
      'src',
      '/media/brand/systems-lattice.webp',
    )
    expect(document.querySelector('video')).toBeNull()
    expect(document.querySelector('canvas')).toBeNull()
    expect(metadata.title).toBe(labPageCopy.title)
    await userEvent.click(screen.getByRole('button', { name: /^Why\?/ }))
    await userEvent.click(screen.getByRole('button', { name: whyCopy.showCode }))
    expect(screen.getByRole('region', { name: 'Rule R1 as code' })).toBeVisible()
    expect(screen.getByText('rules/R1.ts')).toBeInTheDocument()
  }, 20_000)
})
