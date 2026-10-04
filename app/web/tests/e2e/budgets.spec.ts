import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { ROUTES } from './support'

test.use({ browserName: 'chromium', channel: 'chrome' })

const CLS_MAX = 0.1
const INP_MAX_MS = 200
const FONTS_MAX_BYTES = 150_000
const LCP_IMAGE_MAX_BYTES = 250_000
const INITIAL_JS_SOFT_BYTES = 250_000

interface Weights {
  initialJs: number
  lazyJs: number
  css: number
  total: number
}

function measureWeights(page: Page): () => Promise<Weights> {
  const weights: Weights = { initialJs: 0, lazyJs: 0, css: 0, total: 0 }
  const pending: Promise<void>[] = []
  let loaded = false
  page.on('load', () => {
    loaded = true
  })
  page.on('response', (response) => {
    const wasLazy = loaded
    const url = response.url()
    pending.push(
      response
        .request()
        .sizes()
        .then((sizes) => {
          const bytes = sizes.responseBodySize
          weights.total += bytes
          if (/\.css(\?|$)/.test(url)) weights.css += bytes
          if (/\.js(\?|$)/.test(url)) {
            if (wasLazy) weights.lazyJs += bytes
            else weights.initialJs += bytes
          }
        })
        .catch(() => undefined),
    )
  })
  return async () => {
    await Promise.all(pending)
    return weights
  }
}

async function scrollThrough(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y <= height; y += 600) {
    await page.mouse.wheel(0, 600)
    await page.waitForTimeout(80)
  }
  await page.waitForTimeout(500)
}

test.describe('hard gates', () => {
  test.describe.configure({ retries: 2 })

  test('fonts total at most 150 kB', () => {
    const dir = join(process.cwd(), 'public', 'fonts')
    const bytes = readdirSync(dir)
      .filter((name) => name.endsWith('.woff2'))
      .reduce((sum, name) => sum + statSync(join(dir, name)).size, 0)
    console.log(`BUDGET fonts ${String(bytes)} B / ${String(FONTS_MAX_BYTES)}`)
    expect(bytes).toBeLessThanOrEqual(FONTS_MAX_BYTES)
  })

  test('the LCP image on / is at most 250 kB', async ({ page }) => {
    await page.addInitScript(() => {
      const holder = window as unknown as { lcp?: { url: string; tag: string } }
      new PerformanceObserver((list) => {
        const entry = list.getEntries().at(-1) as PerformanceEntry & {
          url: string
          element: Element | null
        }
        holder.lcp = { url: entry.url, tag: entry.element?.tagName ?? '' }
      }).observe({ type: 'largest-contentful-paint', buffered: true })
    })
    const sizes = new Map<string, number>()
    const pending: Promise<void>[] = []
    page.on('response', (response) => {
      pending.push(
        response
          .request()
          .sizes()
          .then((s) => {
            sizes.set(response.url(), s.responseBodySize)
          })
          .catch(() => undefined),
      )
    })
    await page.goto('/')
    await page.waitForTimeout(1500)
    await Promise.all(pending)
    const lcp = await page.evaluate(
      () => (window as unknown as { lcp?: { url: string; tag: string } }).lcp,
    )
    console.log(`BUDGET lcp ${JSON.stringify(lcp)}`)
    expect(lcp).toBeDefined()
    if (lcp?.url) {
      const bytes = sizes.get(lcp.url) ?? 0
      console.log(`BUDGET lcp-image ${String(bytes)} B / ${String(LCP_IMAGE_MAX_BYTES)}`)
      expect(bytes).toBeGreaterThan(0)
      expect(bytes).toBeLessThanOrEqual(LCP_IMAGE_MAX_BYTES)
    }
  })

  for (const path of ROUTES) {
    test(`${path} CLS is under ${String(CLS_MAX)}`, async ({ page }) => {
      await page.addInitScript(() => {
        const holder = window as unknown as { cls: number }
        holder.cls = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & {
              value: number
              hadRecentInput: boolean
            }
            if (!shift.hadRecentInput) holder.cls += shift.value
          }
        }).observe({ type: 'layout-shift', buffered: true })
      })
      await page.goto(path)
      await scrollThrough(page)
      const cls = await page.evaluate(() => (window as unknown as { cls: number }).cls)
      console.log(`BUDGET cls ${path} ${cls.toFixed(4)} / ${String(CLS_MAX)}`)
      expect(cls).toBeLessThan(CLS_MAX)
    })
  }

  test('INP on / with a scene rendering is under 200 ms', async ({ page }) => {
    await page.addInitScript(() => {
      const holder = window as unknown as { worst: number }
      holder.worst = 0
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const event = entry as PerformanceEntry & { interactionId: number }
          if (event.interactionId > 0) {
            holder.worst = Math.max(holder.worst, entry.duration)
          }
        }
      }).observe({
        type: 'event',
        durationThreshold: 16,
        buffered: true,
      } as PerformanceObserverInit)
    })
    await page.goto('/')
    await expect(page.locator('[data-scene-status="active"]').first()).toBeAttached({
      timeout: 15_000,
    })
    for (let i = 0; i < 15; i += 1) {
      await page.mouse.click(300, 400)
      await page.keyboard.press('Tab')
      await page.keyboard.press('PageDown')
      await page.waitForTimeout(120)
    }
    const { worst, active } = await page.evaluate(() => ({
      worst: (window as unknown as { worst: number }).worst,
      active: document.querySelectorAll('[data-scene-status="active"]').length,
    }))
    console.log(
      `BUDGET inp ${String(worst)} ms / ${String(INP_MAX_MS)} scenes-active=${String(active)}`,
    )
    expect(active).toBeGreaterThan(0)
    expect(worst).toBeLessThan(INP_MAX_MS)
  })
})

test.describe('soft budgets, measured and reported only', () => {
  for (const path of ROUTES) {
    test(`${path} weights`, async ({ page }) => {
      const weights = measureWeights(page)
      await page.goto(path, { waitUntil: 'load' })
      await scrollThrough(page)
      const w = await weights()
      const flag = w.initialJs > INITIAL_JS_SOFT_BYTES ? ' OVER' : ''
      console.log(
        `SOFT ${path} initialJs=${String(w.initialJs)}${flag} lazyJs=${String(w.lazyJs)} css=${String(w.css)} total=${String(w.total)}`,
      )
    })
  }
})
