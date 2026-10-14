import { expect, test, type Page } from '@playwright/test'

async function atViewport(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })
}

test('no horizontal overflow at 390', async ({ page }) => {
  await atViewport(page, 390, 844)
  await page.goto('/')
  await page.evaluate(async () => {
    const step = window.innerHeight
    while (window.scrollY + window.innerHeight < document.documentElement.scrollHeight) {
      window.scrollBy(0, step)
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  })
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }))
  expect(widths.scroll).toBe(widths.client)
})
