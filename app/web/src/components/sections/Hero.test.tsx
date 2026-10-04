import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hero } from './Hero'
import { site } from '@/content/site'
import { ui } from '@/content/ui'

const mocked = vi.hoisted(() => ({
  env: {
    siteUrl: 'https://mccorlabs.com',
    bookingUrl: 'https://calendar.example.com/mccor-labs',
    contactEndpoint: null as string | null,
  },
}))

vi.mock('@/lib/env', () => mocked)
vi.mock('@/components/effects/StagScene', () => ({
  StagScene: () => <div data-testid="stag-scene" data-scene-status="idle" />,
}))

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe('Hero', () => {
  beforeEach(() => {
    mockMatchMedia(true)
  })

  it('renders exactly one h1 containing the tagline', () => {
    render(<Hero />)
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent(site.tagline)
  })

  it('renders the studio pill above the slogan', () => {
    render(<Hero />)
    expect(screen.getByText('Senior Engineering & AI Studio')).toHaveClass('rounded-full')
  })

  it('renders the booking call to action', () => {
    render(<Hero />)
    expect(screen.getByRole('link', { name: ui.bookCall })).toHaveAttribute(
      'href',
      mocked.env.bookingUrl,
    )
  })

  it('renders the poster as webp and attaches no video under reduced motion', () => {
    const { container } = render(<Hero />)
    const poster = container.querySelector('img')
    expect(poster).toHaveAttribute('src', '/media/brand/mccor-stag-hero.webp')
    expect(container.querySelector('video')).toBeNull()
  })

  it('attaches the autoplaying video once motion is allowed', async () => {
    mockMatchMedia(false)
    const { container } = render(<Hero />)
    await vi.waitFor(() => {
      expect(container.querySelector('video')).not.toBeNull()
    })
    const video = container.querySelector('video')!
    expect(video.autoplay).toBe(true)
    expect(video.querySelector('source[type="video/webm"]')).toHaveAttribute(
      'src',
      '/media/brand/hero-loop.webm',
    )
  })

  it('keeps the h1 and call to action outside the video and scene wrappers', async () => {
    const { container } = render(<Hero />)
    const h1 = screen.getByRole('heading', { level: 1 })
    const cta = screen.getByRole('link', { name: ui.bookCall })
    const videoWrapper = container.querySelector('img')?.parentElement
    const scene = await screen.findByTestId('stag-scene')
    expect(videoWrapper).toBeTruthy()
    for (const effect of [videoWrapper, scene]) {
      expect(effect?.contains(h1)).toBe(false)
      expect(effect?.contains(cta)).toBe(false)
    }
  })
})
