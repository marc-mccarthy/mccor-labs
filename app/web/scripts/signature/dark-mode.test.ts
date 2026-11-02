import { describe, expect, it } from 'vitest'
import { applyDarkMode, lightness, recolor } from './dark-mode'

const card =
  '<table style="background:#f5f5f7;border:2px solid #991b1b"><tr><td bgcolor="#991b1b" style="color:#f5f5f7">Book</td><td style="color:#08080a">Marc</td><td><img src="https://example.com/a.png" style="width:20px"></td></tr></table>'

describe('lightness', () => {
  it('reads HSL lightness from 6- and 3-digit hex', () => {
    expect(lightness('#000000')).toBe(0)
    expect(lightness('#fff')).toBe(1)
    expect(lightness('#991b1b')).toBeCloseTo(0.353, 2)
  })
})

describe('recolor', () => {
  it('leaves every colour alone when the client makes no change', () => {
    expect(recolor('#f5f5f7', 'background', 'none')).toBe('#f5f5f7')
    expect(recolor('#08080a', 'text', 'none')).toBe('#08080a')
  })

  it('partial invert darkens light backgrounds and keeps dark ones', () => {
    expect(lightness(recolor('#f5f5f7', 'background', 'partial'))).toBeLessThan(0.2)
    expect(recolor('#991b1b', 'background', 'partial')).toBe('#991b1b')
  })

  it('partial invert lightens dark text and keeps light text', () => {
    expect(lightness(recolor('#08080a', 'text', 'partial'))).toBeGreaterThan(0.8)
    expect(recolor('#f5f5f7', 'text', 'partial')).toBe('#f5f5f7')
  })

  it('full invert flips both light and dark colours, keeping the hue', () => {
    expect(lightness(recolor('#f5f5f7', 'background', 'full'))).toBeLessThan(0.2)
    const button = recolor('#991b1b', 'background', 'full')
    expect(lightness(button)).toBeGreaterThan(0.6)
    expect(button.slice(1, 3) > button.slice(3, 5)).toBe(true)
  })

  it('never produces pure black or pure white', () => {
    expect(recolor('#ffffff', 'background', 'full')).not.toBe('#000000')
    expect(recolor('#000000', 'text', 'full')).not.toBe('#ffffff')
  })
})

describe('applyDarkMode', () => {
  it('returns the html untouched for no-change clients', () => {
    expect(applyDarkMode(card, 'none')).toBe(card)
  })

  it('recolours inline styles and bgcolor attributes but never image sources', () => {
    const dark = applyDarkMode(card, 'full')
    expect(dark).not.toContain('background:#f5f5f7')
    expect(dark).not.toContain('bgcolor="#991b1b"')
    expect(dark).toContain('src="https://example.com/a.png"')
  })

  it('keeps a dark button and its light label in partial invert', () => {
    const dark = applyDarkMode(card, 'partial')
    expect(dark).toContain('bgcolor="#991b1b"')
    expect(dark).toContain('style="color:#f5f5f7"')
    expect(dark).not.toContain('style="color:#08080a"')
  })
})
