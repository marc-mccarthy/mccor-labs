import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Hero } from './Hero'
import { INTRO_STORAGE_KEY } from '@/components/motion/VideoMotionHero'
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
  StagScene: ({ className }: { className?: string }) => (
    <div data-testid="stag-scene" data-scene-status="idle" className={className} />
  ),
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

  afterEach(() => {
    sessionStorage.clear()
  })

  it('renders exactly one h1 containing the slogan and no tagline', () => {
    render(<Hero />)
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent(site.slogan)
    expect(screen.queryByText(site.tagline)).toBeNull()
  })

  it('renders the lede as a paragraph under the single h1', () => {
    render(<Hero />)
    const lede = screen.getByText(site.lede)
    expect(lede.tagName).toBe('P')
    expect(lede).toHaveClass('motion-on:animate-lede')
    expect(screen.queryByRole('heading', { name: site.lede })).toBeNull()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('renders the studio pill above the slogan', () => {
    render(<Hero />)
    expect(screen.getByText('Senior Engineering & AI Studio')).toHaveClass('rounded-full')
  })

  it('renders an aria-hidden scrim behind the copy that is hidden at lg', () => {
    const { container } = render(<Hero />)
    const scrim = container.querySelector('[data-hero-scrim]')
    expect(scrim).toHaveAttribute('aria-hidden', 'true')
    expect(scrim).toHaveClass('lg:hidden', '-z-10', 'absolute', 'inset-0')
    expect(scrim?.parentElement).toHaveClass('relative', 'isolate')
  })

  it('sets the h1 on the half-size hero scale with the slogan as one sentence pair', () => {
    render(<Hero />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveClass('text-hero', 'lg:text-hero-lg', 'text-balance')
    expect(h1.textContent).toBe(site.slogan)
  })

  it('gates the badge dot pulse on motion-on', () => {
    render(<Hero />)
    const dot = screen.getByText('Senior Engineering & AI Studio').querySelector('span')
    expect(dot).toHaveClass('motion-on:animate-pulse')
    expect(dot).not.toHaveClass('animate-pulse')
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

  it('plays the stag charge intro on a first visit and hides the stag scene until it ends', async () => {
    mockMatchMedia(false)
    const { container } = render(<Hero />)
    await vi.waitFor(() => {
      expect(container.querySelector('video')).not.toBeNull()
    })
    expect(container.querySelector('video source[type="video/webm"]')).toHaveAttribute(
      'src',
      '/media/brand/hero-intro.webm',
    )
    const scene = await screen.findByTestId('stag-scene')
    expect(scene).not.toHaveClass('opacity-0')
    fireEvent.play(container.querySelector('video')!)
    expect(screen.getByTestId('stag-scene')).toHaveClass('opacity-0')
    fireEvent.ended(container.querySelector('video')!)
    expect(container.querySelector('video source[type="video/webm"]')).toHaveAttribute(
      'src',
      '/media/brand/hero-loop.webm',
    )
    expect(screen.getByTestId('stag-scene')).not.toHaveClass('opacity-0')
  })

  it('attaches the autoplaying loop once motion is allowed and the intro was seen', async () => {
    mockMatchMedia(false)
    sessionStorage.setItem(INTRO_STORAGE_KEY, '1')
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
    mockMatchMedia(false)
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
