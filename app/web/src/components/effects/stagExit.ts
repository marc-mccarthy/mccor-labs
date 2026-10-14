const EXIT_START = 0.35
const EXIT_END = 0.9

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

export function stagExitAmount(scrollY: number, heroHeight: number): number {
  if (!(heroHeight > 0)) return 0
  return smoothstep(EXIT_START, EXIT_END, clamp01(scrollY / heroHeight))
}

export function roundStagExit(amount: number): string {
  return String(Math.round(amount * 10) / 10)
}
