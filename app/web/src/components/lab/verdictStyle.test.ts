import { describe, expect, it } from 'vitest'
import { badgeVariants } from '@/components/ui/badge'
import { VERDICTS } from '@/content/lab/rubric'
import { colorTokens, contrastRatio } from '@/test/contrast'
import { VERDICT_STYLE } from './verdictStyle'

const TOKEN = '(border-strong|border|elevated|surface|base|muted|text|brand|accent)'

function tokenOf(classes: string, prefix: 'text' | 'bg' | 'border'): string | undefined {
  return new RegExp(`(?:^|\\s)${prefix}-${TOKEN}(?=\\s|$)`).exec(classes)?.[1]
}

function cardBackground(verdict: (typeof VERDICTS)[number]): string {
  return tokenOf(VERDICT_STYLE[verdict].card, 'bg') ?? 'surface'
}

describe('verdict styling', () => {
  const tokens = colorTokens()

  it.each(VERDICTS)('%s label meets 4.5:1 on its card', (verdict) => {
    const label = tokenOf(badgeVariants({ variant: verdict }), 'text')
    expect(label, `${verdict} badge has no text token`).toBeDefined()
    expect(
      contrastRatio(tokens[label!]!, tokens[cardBackground(verdict)]!),
    ).toBeGreaterThanOrEqual(4.5)
  })

  it.each(VERDICTS)('%s marker meets 3:1 on its card', (verdict) => {
    const marker = VERDICT_STYLE[verdict].marker
    const token = tokenOf(marker, 'bg') ?? tokenOf(marker, 'border')
    expect(token, `${verdict} marker has no color token`).toBeDefined()
    expect(
      contrastRatio(tokens[token!]!, tokens[cardBackground(verdict)]!),
    ).toBeGreaterThanOrEqual(3)
  })

  it.each(VERDICTS)('%s marker is an inline shape, never positioned', (verdict) => {
    expect(VERDICT_STYLE[verdict].marker).not.toMatch(/\b(absolute|inset-\S+)\b/)
  })

  it('gives only do-not-automate a card rule, positioned inside a clipped card', () => {
    for (const verdict of VERDICTS) {
      if (verdict === 'do-not-automate') continue
      expect(VERDICT_STYLE[verdict].cardRule).toBeUndefined()
    }
    const style = VERDICT_STYLE['do-not-automate']
    expect(style.marker).toBe('h-3 w-px bg-brand')
    expect(style.cardRule).toBe('absolute inset-y-0 left-0 w-px bg-brand')
    expect(style.card).toMatch(/(?:^|\s)relative(?=\s|$)/)
    expect(style.card).toMatch(/(?:^|\s)overflow-hidden(?=\s|$)/)
    expect(
      contrastRatio(
        tokens[tokenOf(style.cardRule!, 'bg')!]!,
        tokens[cardBackground('do-not-automate')]!,
      ),
    ).toBeGreaterThanOrEqual(3)
  })

  it('never uses brand as a label color', () => {
    for (const verdict of VERDICTS) {
      expect(badgeVariants({ variant: verdict })).not.toMatch(/\btext-brand\b/)
    }
  })

  it('keeps control edges at 3:1 on the card and on the chosen fill', () => {
    expect(
      contrastRatio(tokens['border-strong']!, tokens.surface!),
    ).toBeGreaterThanOrEqual(3)
    expect(
      contrastRatio(tokens['border-strong']!, tokens.elevated!),
    ).toBeGreaterThanOrEqual(3)
  })

  it('gives each verdict a distinct marker shape', () => {
    const markers = VERDICTS.map((verdict) => VERDICT_STYLE[verdict].marker)
    expect(new Set(markers).size).toBe(VERDICTS.length)
  })
})
