import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ALLOWED: Record<string, number> = {
  'legal.ts': 6,
}

function countPlaceholders(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const file of readdirSync(import.meta.dirname, {
    recursive: true,
    encoding: 'utf8',
  })) {
    if (!/\.tsx?$/.test(file) || /\.test\.tsx?$/.test(file)) continue
    const found =
      readFileSync(join(import.meta.dirname, file), 'utf8').split('TODO(owner)').length -
      1
    if (found > 0) counts[file] = found
  }
  return counts
}

describe('owner placeholders in content', () => {
  it('match the allowlist exactly, so none are added and the entry goes with the last one', () => {
    const counts = countPlaceholders()
    const mismatches = [...new Set([...Object.keys(ALLOWED), ...Object.keys(counts)])]
      .filter((file) => (counts[file] ?? 0) !== (ALLOWED[file] ?? 0))
      .map(
        (file) =>
          `${file}: found ${String(counts[file] ?? 0)}, allowed ${String(ALLOWED[file] ?? 0)}`,
      )
    expect(mismatches).toEqual([])
  })
})
