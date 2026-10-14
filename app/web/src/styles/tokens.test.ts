import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

function tokens(): Record<string, string> {
  const css = readFileSync(join(import.meta.dirname, 'globals.css'), 'utf8')
  const out: Record<string, string> = {}
  for (const match of css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    out[match[1]!] = match[2]!.toLowerCase()
  }
  return out
}

function channel(value: number): number {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  )
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const PAIRS: readonly [string, string, number, string][] = [
  ['text', 'base', 4.5, 'body text on page'],
  ['text', 'surface', 4.5, 'text on card'],
  ['text', 'elevated', 4.5, 'text on raised surface'],
  ['muted', 'base', 4.5, 'secondary text on page'],
  ['muted', 'surface', 4.5, 'secondary text on card'],
  ['accent', 'base', 4.5, 'link on page'],
  ['accent', 'surface', 4.5, 'link on card'],
  ['base', 'accent', 4.5, 'dark label on accent button'],
  ['on-accent', 'accent', 4.5, 'accent button label under its own token'],
  ['on-accent', 'accent-hover', 4.5, 'accent button label on the hover fill'],
  ['brand', 'base', 3.0, 'brand as large display type'],
  ['border-strong', 'base', 3.0, 'control border on page'],
  ['border-strong', 'surface', 3.0, 'control border on card'],
  ['accent', 'base', 3.0, 'focus ring on page'],
  ['glow-red', 'base', 3.0, 'crimson red glow as a non-text graphic on the page'],
]

describe('design tokens', () => {
  it('defines every token the components rely on', () => {
    const t = tokens()
    for (const name of [
      'base',
      'surface',
      'elevated',
      'border',
      'border-strong',
      'muted',
      'text',
      'brand',
      'accent',
      'accent-hover',
      'on-accent',
      'glow-red',
    ]) {
      expect(t[name], `--color-${name} is missing from globals.css`).toMatch(
        /^#[0-9a-f]{6}$/,
      )
    }
  })

  it.each(PAIRS)('%s on %s meets %s:1 (%s)', (fg, bg, required) => {
    const t = tokens()
    const ratio = contrast(t[fg]!, t[bg]!)
    expect(ratio).toBeGreaterThanOrEqual(required)
  })

  it('carries no token whose name contradicts its value', () => {
    const css = readFileSync(join(import.meta.dirname, 'globals.css'), 'utf8')
    expect(css).not.toMatch(/--color-glow-violet/)
    expect(css).not.toMatch(/--color-glow-cyan/)
    expect(css).not.toMatch(/--color-glow-orange/)
  })

  it('keeps the decorative border decorative, not a control border', () => {
    const t = tokens()
    expect(contrast(t.border!, t.base!)).toBeLessThan(3)
  })

  it('defines a display and a mono font token', () => {
    const css = readFileSync(join(import.meta.dirname, 'globals.css'), 'utf8')
    expect(css).toMatch(/--font-display:/)
    expect(css).toMatch(/--font-mono:/)
  })

  it('keeps self-hosted font weight under the 150kB budget', () => {
    const dir = join(import.meta.dirname, '../../public/fonts')
    const total = readdirSync(dir)
      .filter((name) => name.endsWith('.woff2'))
      .reduce((sum, name) => sum + statSync(join(dir, name)).size, 0)
    expect(total).toBeLessThan(150_000)
  })

  it('defines the type, spacing, radius and motion scales', () => {
    const css = readFileSync(join(import.meta.dirname, 'globals.css'), 'utf8')
    for (const name of [
      '--text-display-sm',
      '--text-display-md',
      '--text-display-lg',
      '--space-xs',
      '--space-sm',
      '--space-md',
      '--space-lg',
      '--space-xl',
      '--space-2xl',
      '--space-3xl',
      '--radius-sm',
      '--radius-md',
      '--radius-lg',
      '--radius-xl',
      '--radius-full',
      '--duration-pointer',
      '--duration-standard',
      '--duration-scene',
      '--duration-route',
      '--delay-considered',
      '--stagger-interval',
      '--ease-standard',
      '--ease-pointer',
      '--ease-route',
    ]) {
      expect(css, `${name} is missing from globals.css`).toMatch(new RegExp(`${name}:`))
    }
  })

  it('pins --duration-pointer to the spec value', () => {
    const css = readFileSync(join(import.meta.dirname, 'globals.css'), 'utf8')
    expect(css).toMatch(/--duration-pointer:\s*0\.12s/)
  })

  it('pins --ease-standard to the Material standard curve', () => {
    const css = readFileSync(join(import.meta.dirname, 'globals.css'), 'utf8')
    expect(css).toMatch(/--ease-standard:\s*cubic-bezier\(0\.4,\s*0,\s*0\.2,\s*1\)/)
  })

  it('builds the display sizes from clamp()', () => {
    const css = readFileSync(join(import.meta.dirname, 'globals.css'), 'utf8')
    for (const name of ['--text-display-sm', '--text-display-md', '--text-display-lg']) {
      const match = new RegExp(`${name}:\\s*([^;]+);`).exec(css)
      expect(match?.[1], `${name} is not a clamp()`).toMatch(/^clamp\(/)
    }
  })

  it('sizes the hero slogan at half the display scale', () => {
    const css = readFileSync(join(import.meta.dirname, 'globals.css'), 'utf8')
    const clampOf = (name: string) => {
      const match = new RegExp(`${name}:\\s*clamp\\(([^;]+)\\);`).exec(css)
      return (match?.[1] ?? '').match(/[\d.]+/g)?.map(Number)
    }
    const half = (values: number[] | undefined) => values?.map((value) => value / 2)
    expect(clampOf('--text-hero')).toEqual(half(clampOf('--text-display-md')))
    expect(clampOf('--text-hero-lg')).toEqual(half(clampOf('--text-display-lg')))
  })
})

const GRAIN_DARKEST = 68
const GRAIN_LIGHTEST = 190

function grainRule(): string {
  const css = readFileSync(join(import.meta.dirname, 'globals.css'), 'utf8')
  return /\n {2}body::after \{([^}]+)\}/.exec(css)?.[1] ?? ''
}

function blend(hex: string, grey: number, opacity: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  const mixed = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((value) =>
    Math.round(value * (1 - opacity) + grey * opacity),
  )
  return `#${mixed.map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

describe('film grain', () => {
  it('is a fixed, non-interactive overlay at no more than 5% opacity', () => {
    const rule = grainRule()
    expect(rule).toMatch(/position:\s*fixed/)
    expect(rule).toMatch(/pointer-events:\s*none/)
    expect(rule).toMatch(/grain-tile\.webp/)
    expect(rule).not.toMatch(/mix-blend-mode/)
    expect(Number(/opacity:\s*([\d.]+)/.exec(rule)?.[1])).toBeLessThanOrEqual(0.05)
  })

  it('drifts in steps, holds still under reduced motion and stays off legal pages', () => {
    const css = readFileSync(join(import.meta.dirname, 'globals.css'), 'utf8')
    expect(grainRule()).toMatch(/animation:\s*grain-drift [^;]*steps\(/)
    expect(css).toMatch(
      /prefers-reduced-motion: reduce\)[\s\S]*body::after \{\s*animation: none;/,
    )
    expect(css).toMatch(/body:has\(\[data-legal\]\)::after \{\s*display: none;/)
  })

  it('scopes the header scroll effects to supporting browsers, motion and non-legal pages', () => {
    const css = readFileSync(join(import.meta.dirname, 'globals.css'), 'utf8')
    const block = css.slice(css.indexOf('@supports (animation-timeline: scroll())'))
    expect(block).toMatch(/@media \(prefers-reduced-motion: no-preference\)/)
    expect(block).toMatch(/animation-timeline: scroll\(root\)/)
    expect(block).toMatch(/animation-range: 0 80px/)
    expect(block).toMatch(/:not\(:has\(\[data-legal\], \[data-careers\]\)\)/)
    expect(block).toMatch(/\[data-site-header\]::before/)
    expect(block).toMatch(/\[data-site-header\]::after/)
  })

  it.each([
    ['base', 4.5],
    ['surface', 4.5],
  ])('keeps muted text on %s above AA in the worst grain pixel', (bg, required) => {
    const t = tokens()
    const opacity = Number(/opacity:\s*([\d.]+)/.exec(grainRule())?.[1])
    const ratio = contrast(
      blend(t.muted!, GRAIN_DARKEST, opacity),
      blend(t[bg]!, GRAIN_LIGHTEST, opacity),
    )
    expect(ratio).toBeGreaterThanOrEqual(required)
  })
})
