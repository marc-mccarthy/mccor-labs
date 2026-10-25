import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HomePage, { metadata } from './page'

vi.mock('@/components/sections/Hero', () => ({ Hero: () => <div /> }))
vi.mock('@/components/sections/DeliveredStrip', () => ({
  DeliveredStrip: () => <div data-testid="delivered" />,
}))
vi.mock('@/components/sections/ServicesPreview', () => ({
  ServicesPreview: () => <div data-testid="services" />,
}))
vi.mock('@/components/sections/SystemsScene', () => ({
  SystemsScene: () => <div data-testid="systems" />,
}))
vi.mock('@/components/sections/PipelineSection', () => ({
  PipelineSection: () => <div data-testid="pipeline" />,
}))
vi.mock('@/components/sections/ProcessScroller', () => ({
  ProcessScroller: () => <div data-testid="process" />,
}))
vi.mock('@/components/sections/CtaBlock', () => ({ CtaBlock: () => <div /> }))

describe('HomePage', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  it('sets an absolute title that skips the layout template', () => {
    expect(metadata.title).toEqual({
      absolute: 'McCor Labs · Swift by Instinct. Engineered to the Core.',
    })
    expect(metadata.alternates).toEqual({ canonical: '/' })
  })

  it('places a seam after services and after the pipeline, none above delivered', () => {
    const { container } = render(<HomePage />)
    const seams = [...container.querySelectorAll('[data-section-seam]')]
    expect(seams).toHaveLength(2)
    const seamAfter = (testId: string) =>
      container.querySelector(`[data-testid="${testId}"]`)?.nextElementSibling
    expect(seamAfter('services')?.querySelector('[data-section-seam]')).not.toBeNull()
    expect(seamAfter('pipeline')?.querySelector('[data-section-seam]')).not.toBeNull()
    expect(
      seamAfter('delivered')?.querySelector('[data-section-seam]') ?? null,
    ).toBeNull()
  })
})
