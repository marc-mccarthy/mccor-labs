import { act, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const on = vi.fn(() => () => undefined)
const destroy = vi.fn()
const raf = vi.fn()

const motionDiv = vi.hoisted(() => ({
  style: null as { y: { get: () => number } } | null,
}))

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>()
  const { forwardRef, useLayoutEffect } = await import('react')
  const MotionDiv = forwardRef<
    HTMLDivElement,
    { style: { y: { get: () => number } }; children?: ReactNode }
  >(function MotionDiv({ style, children }, ref) {
    useLayoutEffect(() => {
      motionDiv.style = style
    })
    return (
      <div ref={ref} data-motion-div="">
        {children}
      </div>
    )
  })
  return { ...actual, m: { div: MotionDiv } }
})

vi.mock('lenis', () => ({
  default: class MockLenis {
    on = on
    destroy = destroy
    raf = raf
  },
}))

import { LenisProvider } from './LenisProvider'
import { MotionPauseProvider, useMotionPaused } from './MotionPauseProvider'
import { Parallax } from './Parallax'

function PauseButton() {
  const { toggle } = useMotionPaused()
  return (
    <button type="button" onClick={toggle}>
      pause
    </button>
  )
}

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

describe('Parallax', () => {
  it('renders its children', () => {
    mockMatchMedia(false)
    render(<Parallax>content</Parallax>)
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('applies no transform under reduced motion', () => {
    mockMatchMedia(true)
    render(
      <Parallax>
        <p>content</p>
      </Parallax>,
    )
    const node = screen.getByText('content')
    expect(getComputedStyle(node).transform).toBe('')
  })

  it('subscribes to the Lenis scroll event when a real provider supplies an instance', () => {
    mockMatchMedia(false)
    render(
      <LenisProvider>
        <Parallax>
          <p>content</p>
        </Parallax>
      </LenisProvider>,
    )
    expect(on).toHaveBeenCalledWith('scroll', expect.any(Function))
  })

  describe('motion pause', () => {
    afterEach(() => {
      localStorage.clear()
      delete document.documentElement.dataset.motion
    })

    it('drops the offset while paused without remounting its children, and follows again on unpause', () => {
      mockMatchMedia(false)
      render(
        <MotionPauseProvider>
          <PauseButton />
          <Parallax>
            <p>content</p>
          </Parallax>
        </MotionPauseProvider>,
      )
      const child = screen.getByText('content')
      const offset = () => motionDiv.style?.y.get()
      const moving = offset()
      expect(moving).not.toBe(0)

      act(() => {
        screen.getByRole('button', { name: 'pause' }).click()
      })
      expect(offset()).toBe(0)
      act(() => {
        window.dispatchEvent(new Event('scroll'))
      })
      expect(offset()).toBe(0)
      expect(screen.getByText('content')).toBe(child)

      act(() => {
        screen.getByRole('button', { name: 'pause' }).click()
      })
      expect(offset()).toBe(moving)
      expect(screen.getByText('content')).toBe(child)
    })
  })
})
