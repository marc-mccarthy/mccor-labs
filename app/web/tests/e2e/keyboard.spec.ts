import { expect, test } from '@playwright/test'

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
  await page.keyboard.press('End')
  await page.waitForTimeout(600)
  await page.keyboard.press('Home')
  await page.waitForTimeout(600)
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(50)
})

test('an in-page anchor moves the scroll position', async ({ page }) => {
  await page.goto('/services/#ai-engineering')
  await page.waitForTimeout(600)
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
})
