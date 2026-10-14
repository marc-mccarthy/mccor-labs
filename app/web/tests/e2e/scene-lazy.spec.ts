import { expect, test } from '@playwright/test'

import { trackThreeRequests } from './support'

interface Snapshot {
  statuses: (string | null)[]
  contexts: number
}

test('below-fold scenes stay idle and create no WebGL context until scrolled to', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const holder = window as unknown as { contexts: number }
    holder.contexts = 0
    const proto = HTMLCanvasElement.prototype
    const original = Reflect.get(proto, 'getContext') as (...args: unknown[]) => unknown
    Reflect.set(
      proto,
      'getContext',
      function (this: HTMLCanvasElement, ...args: unknown[]) {
        if (args[0] === 'webgl2') holder.contexts += 1
        return Reflect.apply(original, this, args)
      },
    )
  })
  const snapshot = (): Promise<Snapshot> =>
    page.evaluate(() => ({
      statuses: Array.from(document.querySelectorAll('[data-scene-status]')).map((n) =>
        n.getAttribute('data-scene-status'),
      ),
      contexts: (window as unknown as { contexts: number }).contexts,
    }))

  await page.goto('/', { waitUntil: 'load' })
  await expect(page.locator('[data-scene-status]')).toHaveCount(4)
  await expect(page.locator('[data-scene-status="active"]')).toHaveCount(1, {
    timeout: 15_000,
  })
  await page.waitForTimeout(1000)
  const atLoad = await snapshot()
  expect(atLoad.statuses).toEqual(['active', 'idle', 'idle', 'idle'])
  expect(atLoad.contexts).toBe(2)

  for (let i = 0; i < 10; i += 1) {
    await page.mouse.wheel(0, 700)
    await page.waitForTimeout(400)
  }
  await expect(page.locator('[data-scene-status="active"]')).toHaveCount(4, {
    timeout: 15_000,
  })
  const afterScroll = await snapshot()
  expect(afterScroll.contexts).toBe(5)
})

test.describe('/contact/ beam', () => {
  test('goes active after idle at 1440 and fetches three only after load', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const threeRequests = trackThreeRequests(page)
    await page.goto('/contact/', { waitUntil: 'load' })
    await expect(page.locator('[data-scene-status="active"]')).toHaveCount(1, {
      timeout: 15_000,
    })
    const urls = await threeRequests()
    expect(urls.length).toBeGreaterThan(0)
    const timing = await page.evaluate((names) => {
      const navigation = performance.getEntriesByType('navigation')[0] as
        PerformanceNavigationTiming | undefined
      return {
        loadEnd: navigation?.loadEventEnd ?? Number.NaN,
        starts: names.map(
          (name) => performance.getEntriesByName(name)[0]?.startTime ?? Number.NaN,
        ),
      }
    }, urls)
    expect(timing.loadEnd).toBeGreaterThan(0)
    for (const start of timing.starts) {
      expect(start).toBeGreaterThanOrEqual(timing.loadEnd)
    }
  })

  test('mounts no scene and fetches no three at 390', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const threeRequests = trackThreeRequests(page)
    await page.goto('/contact/', { waitUntil: 'load' })
    await expect(page.locator('h1')).toBeVisible()
    await page.waitForTimeout(3000)
    await expect(page.locator('[data-scene-status]')).toHaveCount(0)
    await expect(page.locator('canvas')).toHaveCount(0)
    expect(await threeRequests()).toEqual([])
  })
})
