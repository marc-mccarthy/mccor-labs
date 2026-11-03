const NEIGHBOURS = [-1, 0, 1].flatMap((dy) =>
  [-1, 0, 1].flatMap((dx) => (dx === 0 && dy === 0 ? [] : [[dx, dy] as const])),
)

export function dropSpecks(
  rgba: Uint8Array,
  width: number,
  height: number,
  maxArea: number,
): Uint8Array {
  const out = Uint8Array.from(rgba)
  const seen = new Uint8Array(width * height)
  const opaque = (i: number): boolean => (out[i * 4 + 3] ?? 0) > 0
  for (let start = 0; start < width * height; start++) {
    if (seen[start] || !opaque(start)) continue
    const island = [start]
    seen[start] = 1
    for (const i of island) {
      const x = i % width
      const y = Math.floor(i / width)
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
        const j = ny * width + nx
        if (seen[j] || !opaque(j)) continue
        seen[j] = 1
        island.push(j)
      }
    }
    if (island.length <= maxArea) for (const i of island) out[i * 4 + 3] = 0
  }
  return out
}

export function hexToRgb(hex: string): [number, number, number] {
  if (!/^#[0-9a-f]{6}$/i.test(hex))
    throw new Error(`expected a #rrggbb colour, got: ${hex}`)
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ]
}

export function silhouette(rgba: Uint8Array, hex: string, opacity: number): Uint8Array {
  const [r, g, b] = hexToRgb(hex)
  const out = new Uint8Array(rgba.length)
  for (let i = 0; i < rgba.length; i += 4) {
    out[i] = r
    out[i + 1] = g
    out[i + 2] = b
    out[i + 3] = Math.round((rgba[i + 3] ?? 0) * opacity)
  }
  return out
}
