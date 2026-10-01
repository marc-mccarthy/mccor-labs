import { expect, test } from '@playwright/test'

test.use({ contextOptions: { reducedMotion: 'reduce' } })

test('all content renders and nothing animates under reduced motion @smoke', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible()
  await page.waitForTimeout(600)
  const running = await page.evaluate(() => document.getAnimations().length)
  expect(running).toBe(0)
})

test('no video autoplays under reduced motion', async ({ page }) => {
  await page.goto('/')
  const autoplaying = await page.evaluate(
    () => [...document.querySelectorAll('video')].filter((v) => v.autoplay).length,
  )
  expect(autoplaying).toBe(0)
})
