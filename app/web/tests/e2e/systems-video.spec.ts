import { expect, test } from '@playwright/test'

const video = '[data-testid="systems-video"]'

test('the systems loop attaches only once its section is on screen and then plays', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/', { waitUntil: 'load' })
  await page.waitForTimeout(500)
  await expect(page.locator(video)).toHaveCount(0)
  await page.locator('[data-testid="systems-poster"]').scrollIntoViewIfNeeded()
  await expect(page.locator(video)).toHaveCount(1)
  await expect
    .poll(
      () => page.locator(video).evaluate((node: HTMLVideoElement) => node.currentTime),
      {
        timeout: 15_000,
      },
    )
    .toBeGreaterThan(0.5)
})

test('phones keep the systems poster and never attach the loop', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/', { waitUntil: 'load' })
  await page.locator('[data-testid="systems-poster"]').scrollIntoViewIfNeeded()
  await page.waitForTimeout(1000)
  await expect(page.locator(video)).toHaveCount(0)
  await expect(page.locator('[data-testid="systems-poster"]')).toBeVisible()
})
