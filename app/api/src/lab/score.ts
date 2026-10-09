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

function tokens(text: string): Set<string> {
  return new Set(
    normalizeAnswer(text)
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean),
  )
}

function sharedCount(a: Set<string>, b: Set<string>): number {
  let shared = 0
  for (const token of a) if (b.has(token)) shared += 1
  return shared
}

function pickNeighbour(
  i: number,
  examples: RaceExample[],
  tokenSets: Set<string>[],
): RaceExample | undefined {
  const others = examples.map((example, j) => ({ example, j })).filter(({ j }) => j !== i)
  const counts = new Map<string, number>()
  for (const { example } of others) {
    const key = normalizeAnswer(example.expected)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  let best: { example: RaceExample; score: number; common: number } | undefined
  for (const { example, j } of others) {
    const score = sharedCount(tokenSets[i] ?? new Set(), tokenSets[j] ?? new Set())
    const common = counts.get(normalizeAnswer(example.expected)) ?? 0
    if (
      best === undefined ||
      score > best.score ||
      (score === best.score && common > best.common)
    )
      best = { example, score, common }
  }
  return best?.example
}

export function programAnswers(examples: RaceExample[]): string[] {
  const tokenSets = examples.map((example) => tokens(example.input))
  return examples.map((_, i) => pickNeighbour(i, examples, tokenSets)?.expected ?? '')
}
