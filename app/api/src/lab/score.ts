import type { RaceExample } from './types'

export function normalizeAnswer(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function scoreAnswers(
  answers: string[],
  expected: string[],
): { correct: number; total: number } {
  const correct = expected.filter(
    (want, i) => normalizeAnswer(answers[i] ?? '') === normalizeAnswer(want),
  ).length
  return { correct, total: expected.length }
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'you',
  'your',
  'our',
  'this',
  'that',
  'from',
  'have',
  'are',
  'was',
  'can',
  'not',
])

function tokens(text: string): Set<string> {
  return new Set(
    normalizeAnswer(text)
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
  )
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let shared = 0
  for (const token of a) if (b.has(token)) shared += 1
  const union = a.size + b.size - shared
  return union === 0 ? 0 : shared / union
}

function pickNeighbour(
  i: number,
  examples: RaceExample[],
  tokenSets: Set<string>[],
): RaceExample | undefined {
  let best: { example: RaceExample; score: number } | undefined
  examples.forEach((example, j) => {
    if (j === i) return
    const score = jaccard(tokenSets[i] ?? new Set(), tokenSets[j] ?? new Set())
    if (best === undefined || score > best.score) best = { example, score }
  })
  return best?.example
}

export function programAnswers(examples: RaceExample[]): string[] {
  const tokenSets = examples.map((example) => tokens(example.input))
  return examples.map((_, i) => pickNeighbour(i, examples, tokenSets)?.expected ?? '')
}
