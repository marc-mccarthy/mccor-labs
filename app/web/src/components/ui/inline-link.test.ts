import { describe, expect, it } from 'vitest'
import { inlineLink, inlineLinkDescendant } from './inline-link'

const colourLiteral = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/i

describe('inlineLink', () => {
  it('has hover, active and decoration classes', () => {
    expect(inlineLink).toContain('hover:decoration-2')
    expect(inlineLink).toContain('hover:text-accent-hover')
    expect(inlineLink).toContain('active:text-text')
    expect(inlineLink).toContain('underline')
    expect(inlineLink).toContain('decoration-1')
  })

  it('gates every transition behind motion-on', () => {
    const transitions = inlineLink
      .split(' ')
      .filter(
        (c) => c.includes('transition') || c.includes('duration') || c.includes('ease'),
      )
    expect(transitions.length).toBeGreaterThan(0)
    for (const c of transitions) expect(c.startsWith('motion-on:')).toBe(true)
  })

  it('has no colour literal', () => {
    expect(inlineLink).not.toMatch(colourLiteral)
  })
})

describe('inlineLinkDescendant', () => {
  it('has hover, active and decoration classes', () => {
    expect(inlineLinkDescendant).toContain('[&_a:hover]:decoration-2')
    expect(inlineLinkDescendant).toContain('[&_a:hover]:text-accent-hover')
    expect(inlineLinkDescendant).toContain('[&_a:active]:text-text')
  })

  it('has no transition utilities', () => {
    expect(inlineLinkDescendant).not.toMatch(/transition|duration|ease/)
  })

  it('has no colour literal', () => {
    expect(inlineLinkDescendant).not.toMatch(colourLiteral)
  })
})
