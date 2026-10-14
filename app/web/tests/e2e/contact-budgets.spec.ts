import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { EMPTY_ANSWERS, QUESTION_KEYS, classifyStep } from '@/content/lab/rubric'
import { encodeLabResult, toLabResult } from '@/lib/labResult'

import { builtWithEndpoint } from './support'

test.use({ browserName: 'chromium', channel: 'chrome' })

const CLS_MAX = 0.1
const INP_MAX_MS = process.env.CI ? 600 : 200

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

function labHash(): string {
  const answers = {
    ...EMPTY_ANSWERS,
    ...Object.fromEntries(QUESTION_KEYS.map((key) => [key, 'yes'])),
  }
  const result = toLabResult(
    [{ name: 'Send invoices', answers, result: classifyStep(answers) }],
    true,
  )
  return `#lab=${encodeLabResult(result)}`
}

test.describe.configure({ mode: 'serial' })

test.describe('contact gates', () => {
  test.describe.configure({ retries: 2 })

  let requests: string[] = []

  test.beforeEach(async ({ page }) => {
    requests = []
    page.on('request', (request) => {
      if (request.url().includes('/api/contact')) requests.push(request.url())
    })
    await page.route('**/api/contact', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: '{}',
      })
    })
  })

  test.afterEach(() => {
    expect(requests).toEqual([])
  })

  test.describe('reduced motion at 1440', () => {
    const viewport = { width: 1440, height: 900 }
    test.use({ viewport, contextOptions: { reducedMotion: 'reduce' } })

    test('/contact/ has no layout shift under reduced motion at 1440', async ({
      page,
    }) => {
      const cls = await measureCls(page, '/contact/')
      expect(cls).toBe(0)
    })

    test('/contact/ server layout matches the hydrated layout under reduced motion at 1440', async ({
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
      await serverPage.goto(`${String(baseURL)}/contact/`, { waitUntil: 'networkidle' })
      const before = await serverPage.evaluate(
        () => document.documentElement.scrollHeight,
      )
      await server.close()
      await page.goto('/contact/', { waitUntil: 'networkidle' })
      const after = await page.evaluate(() => document.documentElement.scrollHeight)
      expect(after).toBe(before)
    })
  })

  test(`/contact/#lab= CLS is under budget`, async ({ page }) => {
    const cls = await measureCls(page, `/contact/${labHash()}`)
    expect(cls).toBeLessThan(CLS_MAX)
  })

  test.describe('typing at 1440', () => {
    test.skip(!builtWithEndpoint(), 'needs a build with the contact endpoint')
    test.use({ viewport: { width: 1440, height: 900 } })

    test(`INP on /contact/ while typing is under budget`, async ({ page }) => {
      await observeWorstInteraction(page)
      await page.goto('/contact/', { waitUntil: 'networkidle' })
      await page.locator('#message').click()
      await page.keyboard.type('x'.repeat(40), { delay: 20 })
      for (let i = 0; i < 6; i += 1) {
        await page.keyboard.press('Tab')
        await page.waitForTimeout(120)
      }
      const worst = await page.evaluate(
        () => (window as unknown as { worst: number }).worst,
      )
      expect(worst).toBeLessThan(INP_MAX_MS)
    })
  })
})
