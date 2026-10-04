import { expect, test } from '@playwright/test'

import { process } from '@/content/process'
import { services } from '@/content/services'
import { team } from '@/content/team'

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

test.describe('process page', () => {
  test('every stage is in the DOM and reachable by scrolling @smoke', async ({
    page,
  }) => {
    await page.goto('/process/')
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h3')).toHaveCount(process.length)
    const range = await page.evaluate(() => {
      const rect = document
        .querySelector('ol')
        ?.closest('section')
        ?.getBoundingClientRect()
      return { top: (rect?.top ?? 0) + window.scrollY, height: rect?.height ?? 0 }
    })
    for (const [index, stage] of process.entries()) {
      const fraction = index / (process.length - 1)
      const y = range.top + fraction * (range.height - 800)
      await page.evaluate((target) => {
        window.scrollTo(0, target)
      }, y)
      await page.waitForTimeout(400)
      await expect(
        page.getByRole('heading', { level: 3, name: stage.title }),
      ).toBeInViewport()
    }
  })
})

test.describe('about page', () => {
  test('states the team size and lists four people with mailto links @smoke', async ({
    page,
  }) => {
    await page.goto('/about/')
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.getByText(/we are four people/i)).toBeVisible()
    for (const member of team) {
      await expect(
        page.getByRole('heading', { level: 3, name: member.name }),
      ).toBeVisible()
    }
    await expect(page.locator('main a[href^="mailto:"]')).toHaveCount(4)
  })
})
