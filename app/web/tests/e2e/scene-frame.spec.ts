import { expect, test } from '@playwright/test'

interface Samples {
  render: number[]
  gap: number[]
  count: number
}

interface SceneRow {
  label: string
  samples: Samples
}

function p95(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? 0
}

test.describe('scene frame cost', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test.describe('motion allowed', () => {
    test.use({ contextOptions: { reducedMotion: 'no-preference' } })

    test('logs p95 render and rAF gap per scene while scrolling the page', async ({
      page,
    }) => {
      await page.addInitScript(() => {
        Reflect.set(window, '__sceneStats', {})
      })
      await page.goto('/', { waitUntil: 'load' })
      await expect(page.locator('[data-scene-status="active"]')).not.toHaveCount(0, {
        timeout: 15_000,
      })

      for (let i = 0; i < 24; i += 1) {
        await page.mouse.wheel(0, 600)
        await page.waitForTimeout(500)
      }

      const rows = await page.evaluate<SceneRow[]>(() => {
        const stats = Reflect.get(window, '__sceneStats') as Record<string, Samples>
        const roots = Array.from(document.querySelectorAll('[data-scene-key]'))
        return Object.entries(stats).map(([key, samples]) => {
          const root = roots.find((node) => node.getAttribute('data-scene-key') === key)
          const index = root ? roots.indexOf(root) : -1
          const section = root?.closest('section, header, footer, [id]')
          const host =
            [section?.id, section?.tagName.toLowerCase()].find((name) => name) ??
            'unknown'
          return { label: `scene${String(index)}@${host}`, samples }
        })
      })

      for (const row of rows) {
        console.log(
          `SOFT ${row.label} p95 render ${p95(row.samples.render).toFixed(2)}ms p95 gap ${p95(row.samples.gap).toFixed(2)}ms (${String(row.samples.count)} frames)`,
        )
      }
    })
  })

  test.describe('reduced motion', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } })

    test('runs no active scenes and records no stats', async ({ page }) => {
      await page.addInitScript(() => {
        Reflect.set(window, '__sceneStats', {})
      })
      await page.goto('/', { waitUntil: 'load' })
      for (let i = 0; i < 6; i += 1) {
        await page.mouse.wheel(0, 900)
        await page.waitForTimeout(200)
      }
      await expect(page.locator('[data-scene-status="active"]')).toHaveCount(0)
      const keys = await page.evaluate(() =>
        Object.keys(Reflect.get(window, '__sceneStats') as object),
      )
      expect(keys).toEqual([])
    })
  })
})
