import { expect, test } from '@playwright/test'

import { ui } from '@/content/ui'

import { builtWithEndpoint } from './support'

const REFERENCE = 'MC-7Q4K'

test.skip(!builtWithEndpoint(), 'needs a build with the contact endpoint')

test.use({ viewport: { width: 1440, height: 900 } })

test('contact signal reaches sent', async ({ page }) => {
  const requests: string[] = []
  let fulfilled = 0
  page.on('request', (request) => {
    if (request.url().includes('/api/contact')) requests.push(request.url())
  })
  await page.route('**/api/contact', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reference: REFERENCE }),
    })
    fulfilled += 1
  })
  await page.addInitScript(() => {
    window.__contactSignal = {}
  })

  await page.goto('/contact/', { waitUntil: 'networkidle' })
  await page.locator('#name').fill('Ada Lovelace')
  await page.locator('#email').fill('ada@example.com')
  await page.locator('#phone').fill('2025550123')
  await page.locator('#message').fill('A message long enough to pass validation.')
  await expect.poll(() => page.evaluate(() => window.__contactSignal?.charge)).toBe(1)
  await page.getByRole('button', { name: ui.formSubmit }).click()

  await expect.poll(() => page.evaluate(() => window.__contactSignal?.phase)).toBe('sent')
  expect(await page.evaluate(() => window.__contactSignal?.charge)).toBe(1)
  expect(requests).toHaveLength(1)
  await expect.poll(() => fulfilled).toBe(requests.length)
})
