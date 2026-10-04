import { expect, test } from '@playwright/test'

import { services } from '@/content/services'

test.describe('services page', () => {
  test('anchors, headings and capabilities are present @smoke', async ({ page }) => {
    await page.goto('/services/')
    await expect(page.locator('h1')).toHaveCount(1)
    for (const service of services) {
      await expect(page.locator(`#${service.slug}`)).toHaveCount(1)
    }
    const ai = services.find((s) => s.slug === 'ai-engineering')
    expect(ai?.capabilities).toHaveLength(5)
    for (const capability of ai?.capabilities ?? []) {
      await expect(
        page.getByRole('heading', { level: 3, name: capability.title }),
      ).toBeVisible()
    }
  })

  test('navigating to an anchor scrolls past zero', async ({ page }) => {
    await page.goto('/services/#ai-engineering')
    await page.waitForTimeout(600)
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  })
})
