export type DarkMode = 'none' | 'partial' | 'full'

type Role = 'background' | 'text' | 'border'

const DARKEST = 0.11
const LIGHTEST = 0.9

function parseHex(hex: string): [number, number, number] {
  const digits = hex
    .replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i, '#$1$1$2$2$3$3')
    .slice(1)
  const channel = (i: number): number => Number.parseInt(digits.slice(i, i + 2), 16) / 255
  return [channel(0), channel(2), channel(4)]
}

function toHex(channels: number[]): string {
  return `#${channels
    .map((c) =>
      Math.round(c * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = parseHex(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g
        ? ((b - r) / d + 2) / 6
        : ((r - g) / d + 4) / 6
  return [h, s, l]
}

function fromHsl(h: number, s: number, l: number): string {
  if (s === 0) return toHex([l, l, l])
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number): number => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t
    if (u < 1 / 6) return p + (q - p) * 6 * u
    if (u < 1 / 2) return q
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6
    return p
  }
  return toHex([channel(h + 1 / 3), channel(h), channel(h - 1 / 3)])
}

export function lightness(hex: string): number {
  return toHsl(hex)[2]
}

function flip(hex: string): string {
  const [h, s, l] = toHsl(hex)
  return fromHsl(h, s, Math.min(LIGHTEST, Math.max(DARKEST, 1 - l)))
}

export function recolor(hex: string, role: Role, mode: DarkMode): string {
  if (mode === 'none') return hex
  if (mode === 'full') return flip(hex)
  const light = lightness(hex) > 0.5
  if (role === 'text') return light ? hex : flip(hex)
  return light ? flip(hex) : hex
}

function roleOf(property: string): Role {
  if (property.includes('background')) return 'background'
  if (property.includes('border')) return 'border'
  return 'text'
}

const HEX = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi

function recolorStyle(style: string, mode: DarkMode): string {
  return style
    .split(';')
    .map((declaration) => {
      const property = declaration.split(':')[0]?.trim().toLowerCase() ?? ''
      return declaration.replace(HEX, (hex) => recolor(hex, roleOf(property), mode))
    })
    .join(';')
}

export function applyDarkMode(html: string, mode: DarkMode): string {
  if (mode === 'none') return html
  return html
    .replace(
      /style="([^"]*)"/g,
      (_, style: string) => `style="${recolorStyle(style, mode)}"`,
    )
    .replace(
      /bgcolor="(#[0-9a-f]{3,6})"/gi,
      (_, hex: string) => `bgcolor="${recolor(hex, 'background', mode)}"`,
    )
}
