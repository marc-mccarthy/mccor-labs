function readToken(name: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function readDurationSeconds(name: string): number {
  const raw = readToken(name)
  return raw.endsWith('ms') ? Number.parseFloat(raw) / 1000 : Number.parseFloat(raw)
}

export function readEasing(name: string): [number, number, number, number] {
  const raw = readToken(name)
  const match = /cubic-bezier\(([^)]+)\)/.exec(raw)
  const parts = (match?.[1] ?? '0,0,1,1')
    .split(',')
    .map((part) => Number.parseFloat(part))
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 1, parts[3] ?? 1]
}
