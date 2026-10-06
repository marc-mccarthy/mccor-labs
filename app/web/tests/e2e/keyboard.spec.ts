import { expect, test } from '@playwright/test'

const PINNED_ROUTES = ['/', '/process/'] as const

test('PageDown scrolls the page @smoke', async ({ page }) => {
  await page.goto('/')
  const before = await page.evaluate(() => window.scrollY)
  await page.keyboard.press('PageDown')
  await page.waitForTimeout(600)
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(before)
})

test('End reaches the bottom of the document @smoke', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('End')
  await page.waitForTimeout(600)
  const { scrollY, scrollHeight, innerHeight } = await page.evaluate(() => ({
    scrollY: window.scrollY,
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }))
  expect(scrollY).toBeGreaterThan(scrollHeight - innerHeight - 50)
})

test('Home returns to the top', async ({ page }) => {
  await page.goto('/')
  const scroll = await page.evaluateHandle(() => ({
    settled: new Promise<number>((resolve) => {
      window.addEventListener(
        'scrollend',
        () => {
          resolve(window.scrollY)
        },
        { capture: true, once: true },
      )
    }),
  }))
  await page.keyboard.press('End')
  expect(await scroll.evaluate(({ settled }) => settled)).toBeGreaterThan(50)
  await page.keyboard.press('Home')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(50)
})

test('an in-page anchor moves the scroll position', async ({ page }) => {
  await page.goto('/services/#ai-engineering')
  await page.waitForTimeout(600)
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
})

for (const path of PINNED_ROUTES) {
  test(`no pinned section on ${path} traps keyboard focus`, async ({ page }) => {
    await page.goto(path)
    await page.waitForTimeout(1500)
    let reachedFooter = false
    for (let i = 0; i < 60 && !reachedFooter; i += 1) {
      await page.keyboard.press('Tab')
      reachedFooter = await page.evaluate(
        () => document.activeElement?.closest('footer') != null,
      )
    }
    expect(reachedFooter).toBe(true)
  })
}
