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
    // The fixture is built with no NEXT_PUBLIC_CONTACT_ENDPOINT, which is a
    // build-time fact this suite controls, so both assertions run
    // unconditionally. Guarding them on the button's absence would make the
    // test pass in exactly the case it exists to catch: a submit button
    // rendered with nowhere to submit to.
    await expect(submit).toHaveCount(0)
    await expect(mailto.first()).toBeVisible()
  })
})
