import type { MarkCount } from './digestQuery'

interface DigestInput {
  counts: readonly MarkCount[]
  since: Date
  until: Date
}

const COLUMNS = [6, 17, 18, 10] as const

function day(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function plural(count: number): string {
  return count === 1 ? '1 mark' : `${String(count)} marks`
}

function row(cells: readonly [string, string, string, string, string]): string {
  return (
    cells
      .slice(0, 4)
      .map((cell, i) => cell.padEnd(COLUMNS[i] ?? 0))
      .join('') + cells[4]
  )
}

export function formatDigest({ counts, since, until }: DigestInput): {
  subject: string
  text: string
} {
  const total = counts.reduce((sum, c) => sum + c.count, 0)
  const lines = [`Should This Be AI? feedback, ${day(since)} to ${day(until)}`, '']
  if (total === 0) {
    lines.push('No marks in the last 7 days.')
  } else {
    lines.push(
      `${plural(total)} in the last 7 days.`,
      '',
      row(['Rule', 'Verdict', 'Reason', 'Rubric', 'Count']),
    )
    for (const c of counts)
      lines.push(row([c.ruleId, c.verdictId, c.reason, c.rubricVersion, String(c.count)]))
  }
  return {
    subject: `Lab feedback: ${plural(total)}, week to ${day(until)}`,
    text: `${lines.join('\n')}\n`,
  }
}
