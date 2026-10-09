import { expect } from 'vitest'

const BANNED: readonly RegExp[] = [
  /medicare/i,
  /franchise/i,
  /\bclients?\b/i,
  /\d[\d,]*\s*(engineers|people|staff|employees)\b/i,
  /\d\s*%|\bper ?cent\b/i,
  /\bguarantee/i,
  /\bproven\b/i,
  /\btrusted by\b/i,
  /\bcase stud(y|ies)\b/i,
  /\bROI\b/,
  /\bsav(e|es|ed|ing) (you |your team )?(time|money|hours|\d)/i,
  /\b\d+x\b|\b\d+ times (faster|cheaper)\b/i,
  /\b(cut|cuts|reduce|reduces|reduced|slash|slashes) (costs?|time|errors?)\b/i,
]

export function assertNoClaims(text: string): void {
  for (const pattern of BANNED) {
    expect(text, `banned claim ${String(pattern)}`).not.toMatch(pattern)
  }
}
