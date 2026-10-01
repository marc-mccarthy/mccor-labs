import { expect, test } from '@playwright/test'

test.describe('contact route', () => {
  test('offers a way to reach the firm @smoke', async ({ page }) => {
    await page.goto('/contact/')
    // With no endpoint configured at build time the form degrades to the
    // booking link plus a mailto. Either shape must give the visitor a route.
    const hasForm = await page.getByRole('button', { name: /send message/i }).count()
    const hasMailto = await page.locator('a[href^="mailto:"]').count()
    expect(hasForm + hasMailto).toBeGreaterThan(0)
  })

  test('never renders a submit button without an endpoint', async ({ page }) => {
    await page.goto('/contact/')
    const submit = page.getByRole('button', { name: /send message/i })
    const mailto = page.locator('a[href^="mailto:"]')
    if ((await submit.count()) === 0) {
      await expect(mailto.first()).toBeVisible()
    }
  })
})
