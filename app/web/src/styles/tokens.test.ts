import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
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

// Every pair the spec commits to, with its required ratio.
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
  // The glows are light sources behind content, not backgrounds for it: a glow never sits
  // under text and never carries meaning, so the pair asserted here is a non-text graphic
  // against the page — WCAG 1.4.11's 3:1 — and not a text pair. Section 3.7 of
  // docs/website-design/PHASE-1-CARRY-FORWARD.md carries the measured text-on-glow figures
  // and why no upper bound is asserted here.
  ['glow-red', 'base', 3.0, 'crimson red glow as a non-text graphic on the page'],
  ['glow-orange', 'base', 3.0, 'solar orange glow as a non-text graphic on the page'],
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
      'glow-orange',
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
  })

  it('keeps the decorative border decorative, not a control border', () => {
    const t = tokens()
    // --color-border is intentionally low contrast (a hairline). If someone
    // raises it to control-border levels, --color-border-strong has become
    // redundant and the distinction has been lost.
    expect(contrast(t.border!, t.base!)).toBeLessThan(3)
  })
})
