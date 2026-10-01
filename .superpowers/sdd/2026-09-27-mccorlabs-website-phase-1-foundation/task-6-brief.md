## Task 6: Tailwind v4 and the design tokens, with contrast measured in a test

**Files:**
- Create: `app/web/src/styles/globals.css`, `app/web/src/lib/cn.ts`, `app/web/src/styles/tokens.test.ts`
- Create: `app/web/postcss.config.mjs`
- Modify: `app/web/package.json`

**Interfaces:**
- Consumes: Task 2.
- Produces: every colour token as a CSS custom property and a Tailwind utility; `cn()` for class merging.

- [ ] **Step 1: Install Tailwind v4 and helpers**

Run:

```bash
pnpm -F web add -D tailwindcss@4.3.3 @tailwindcss/postcss@4.3.3
pnpm -F web add clsx tailwind-merge
```

- [ ] **Step 2: Create the PostCSS config**

Create `app/web/postcss.config.mjs`:

```js
const config = { plugins: { '@tailwindcss/postcss': {} } }
export default config
```

- [ ] **Step 3: Write the failing contrast test**

This pins Review Focus item 5. It parses the real CSS rather than a duplicated copy of the values, so the test cannot drift from what ships.

Create `app/web/src/styles/tokens.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function tokens(): Record<string, string> {
  const css = readFileSync(join(import.meta.dirname, 'globals.css'), 'utf8')
  const out: Record<string, string> = {}
  for (const match of css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    out[match[1]!] = match[2]!.toLowerCase()
  }
  return out
}

function channel(value: number): number {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  )
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

// Every pair the spec commits to, with its required ratio.
const PAIRS: ReadonlyArray<[string, string, number, string]> = [
  ['text', 'base', 4.5, 'body text on page'],
  ['text', 'surface', 4.5, 'text on card'],
  ['text', 'elevated', 4.5, 'text on raised surface'],
  ['muted', 'base', 4.5, 'secondary text on page'],
  ['muted', 'surface', 4.5, 'secondary text on card'],
  ['accent', 'base', 4.5, 'link on page'],
  ['accent', 'surface', 4.5, 'link on card'],
  ['base', 'accent', 4.5, 'dark label on accent button'],
  ['brand', 'base', 3.0, 'brand as large display type'],
  ['border-strong', 'base', 3.0, 'control border on page'],
  ['border-strong', 'surface', 3.0, 'control border on card'],
  ['accent', 'base', 3.0, 'focus ring on page'],
]

describe('design tokens', () => {
  it('defines every token the components rely on', () => {
    const t = tokens()
    for (const name of [
      'base',
      'surface',
      'elevated',
      'border',
      'border-strong',
      'muted',
      'text',
      'brand',
      'accent',
    ]) {
      expect(t[name], `--color-${name} is missing from globals.css`).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it.each(PAIRS)('%s on %s meets %s:1 (%s)', (fg, bg, required, _label) => {
    const t = tokens()
    const ratio = contrast(t[fg]!, t[bg]!)
    expect(ratio).toBeGreaterThanOrEqual(required)
  })

  it('keeps the decorative border decorative, not a control border', () => {
    const t = tokens()
    // --color-border is intentionally low contrast (a hairline). If someone
    // raises it to control-border levels, --color-border-strong has become
    // redundant and the distinction has been lost.
    expect(contrast(t['border']!, t['base']!)).toBeLessThan(3)
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm -F web exec vitest run src/styles/tokens.test.ts`
Expected: FAIL — `globals.css` does not exist yet.

- [ ] **Step 5: Create the stylesheet and tokens**

Create `app/web/src/styles/globals.css`:

```css
@import 'tailwindcss';

/* The single source of colour truth. Every ratio here is verified by
   src/styles/tokens.test.ts against WCAG 2.2 thresholds. Do not change a
   value without running that test. */
@theme {
  --color-base: #070a12;
  --color-surface: #0d121d;
  --color-elevated: #151c2b;
  /* Decorative hairline only — 1.29:1. Never use for an input or control. */
  --color-border: #1d2534;
  /* Control and input borders — 3.47:1 on base. */
  --color-border-strong: #5a6780;
  --color-muted: #8a94a6;
  --color-text: #eef2f8;
  /* Large display type and non-text graphics only: 4.47:1 fails AA for body
     text by 0.03. Use --color-accent for anything small or interactive. */
  --color-brand: #3d6bff;
  /* Links, small text, button fill, focus rings — 5.31:1 on base. */
  --color-accent: #527bff;

  --color-glow-violet: #7c5cff;
  --color-glow-cyan: #22d3ee;
}

:root {
  color-scheme: dark;
}

@layer base {
  * {
    min-width: 0;
  }

  html {
    -webkit-text-size-adjust: 100%;
  }

  body {
    background-color: var(--color-base);
    color: var(--color-text);
    -webkit-font-smoothing: antialiased;
  }

  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

- [ ] **Step 6: Create the class-merge helper**

Create `app/web/src/lib/cn.ts`:

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm -F web exec vitest run src/styles/tokens.test.ts`
Expected: PASS — all 12 contrast pairs plus the two structural assertions.

- [ ] **Step 8: Commit**

```bash
git add app/web/src/styles app/web/src/lib/cn.ts app/web/postcss.config.mjs app/web/package.json pnpm-lock.yaml
git commit -m "feat(web): design tokens with contrast verified in a test"
```

---

