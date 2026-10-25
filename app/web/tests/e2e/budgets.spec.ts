import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { ROUTES } from './support'

test.use({ browserName: 'chromium', channel: 'chrome' })

const CLS_MAX = 0.1
const INP_MAX_MS = process.env.CI ? 600 : 200
const FONTS_MAX_BYTES = 150_000
const LCP_IMAGE_MAX_BYTES = 250_000
const INITIAL_JS_MAX_BYTES = 260_000
const TBT_MAX_MS = process.env.CI ? 600 : 200
const LCP_MAX_MS = process.env.CI ? 1350 : 450
const CPU_THROTTLE_RATE = 4
const LONG_TASK_FLOOR_MS = 50
const SETTLE_MS = 500

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

async function measureCls(page: Page, path: string): Promise<number> {
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
  return page.evaluate(() => (window as unknown as { cls: number }).cls)
}

async function observeWorstInteraction(page: Page) {
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
}

async function measureLoadTiming(page: Page, path: string) {
  await page.addInitScript(() => {
    const holder = window as unknown as { longTasks: number[]; lcp: number }
    holder.longTasks = []
    holder.lcp = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) holder.longTasks.push(entry.duration)
    }).observe({ type: 'longtask', buffered: true })
    new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1)
      if (last) holder.lcp = last.startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE_RATE })
  await page.goto(path, { waitUntil: 'load' })
  await page.waitForTimeout(SETTLE_MS)
  const { longTasks, lcp } = await page.evaluate(() => {
    const holder = window as unknown as { longTasks: number[]; lcp: number }
    return { longTasks: holder.longTasks, lcp: holder.lcp }
  })
  const tbt = longTasks.reduce(
    (sum, duration) => sum + Math.max(0, duration - LONG_TASK_FLOOR_MS),
    0,
  )
  return { tbt, lcp }
}

test.describe('hard gates', () => {
  test.describe.configure({ retries: 2 })

  test('fonts total at most 150 kB', () => {
    const dir = join(process.cwd(), 'public', 'fonts')
    const bytes = readdirSync(dir)
      .filter((name) => name.endsWith('.woff2'))
      .reduce((sum, name) => sum + statSync(join(dir, name)).size, 0)
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
    expect(lcp).toBeDefined()
    if (lcp?.url) {
      const bytes = sizes.get(lcp.url) ?? 0
      expect(bytes).toBeGreaterThan(0)
      expect(bytes).toBeLessThanOrEqual(LCP_IMAGE_MAX_BYTES)
    }
  })

  test(`initial JS on / is at most ${String(INITIAL_JS_MAX_BYTES)} bytes`, async ({
    page,
  }) => {
    const weights = measureWeights(page)
    await page.goto('/', { waitUntil: 'load' })
    const { initialJs } = await weights()
    expect(initialJs).toBeLessThanOrEqual(INITIAL_JS_MAX_BYTES)
  })

  test(`TBT and LCP on / under ${String(CPU_THROTTLE_RATE)}x CPU throttle`, async ({
    page,
  }) => {
    const { tbt, lcp } = await measureLoadTiming(page, '/')
    expect.soft(tbt).toBeLessThanOrEqual(TBT_MAX_MS)
    expect(lcp).toBeLessThanOrEqual(LCP_MAX_MS)
  })

  for (const path of ROUTES) {
    test(`${path} CLS is under ${String(CLS_MAX)}`, async ({ page }) => {
      const cls = await measureCls(page, path)
      expect(cls).toBeLessThan(CLS_MAX)
    })
  }

  test.describe('reduced motion at 1440', () => {
    const viewport = { width: 1440, height: 900 }
    test.use({ viewport, contextOptions: { reducedMotion: 'reduce' } })

    for (const path of ['/', '/process/']) {
      test(`${path} has no layout shift under reduced motion`, async ({ page }) => {
        const cls = await measureCls(page, path)
        expect(cls).toBe(0)
      })

      test(`${path} server layout matches the hydrated layout under reduced motion`, async ({
        browser,
        page,
        baseURL,
      }) => {
        const server = await browser.newContext({
          viewport,
          reducedMotion: 'reduce',
          javaScriptEnabled: false,
        })
        const serverPage = await server.newPage()
        await serverPage.goto(`${String(baseURL)}${path}`, { waitUntil: 'networkidle' })
        const before = await serverPage.evaluate(
          () => document.documentElement.scrollHeight,
        )
        await server.close()
        await page.goto(path, { waitUntil: 'networkidle' })
        const after = await page.evaluate(() => document.documentElement.scrollHeight)
        expect(after).toBe(before)
      })
    }
  })

  test(`INP on / with a scene rendering is under ${String(INP_MAX_MS)} ms`, async ({
    page,
  }) => {
    await observeWorstInteraction(page)
    await page.addInitScript(() => {
      document.addEventListener(
        'click',
        (event) => {
          if (event.target instanceof Element && event.target.closest('a[href]')) {
            event.preventDefault()
          }
        },
        true,
      )
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
    await expect(page).toHaveURL('/')
    const { worst, active } = await page.evaluate(() => ({
      worst: (window as unknown as { worst: number }).worst,
      active: document.querySelectorAll('[data-scene-status="active"]').length,
    }))
    expect(active).toBeGreaterThan(0)
    expect(worst).toBeLessThan(INP_MAX_MS)
  })

  test('INP on /lab/should-this-be-ai/ while answering is under 200 ms', async ({
    page,
  }) => {
    await observeWorstInteraction(page)
    await page.goto('/lab/should-this-be-ai/')
    await page.getByRole('button', { name: 'Load Invoice intake' }).click()
    const costly = page.getByTestId('step-1').getByRole('group', { name: /cost money/ })
    for (let i = 0; i < 15; i += 1) {
      await costly
        .getByRole('radio', { name: i % 2 === 0 ? 'Yes' : 'No', exact: true })
        .click()
      await page.waitForTimeout(120)
    }
    const worst = await page.evaluate(
      () => (window as unknown as { worst: number }).worst,
    )
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
      console.log(
        `SOFT ${path} initialJs=${String(w.initialJs)} lazyJs=${String(w.lazyJs)} css=${String(w.css)} total=${String(w.total)}`,
      )
    })
  }
})
