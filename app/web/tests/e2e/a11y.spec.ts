import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const PATHS = [
  '/',
  '/services/',
  '/work/',
  '/about/',
  '/process/',
  '/contact/',
  '/careers/',
  '/privacy/',
  '/terms/',
  '/404.html',
] as const

for (const path of PATHS) {
  test(`${path} has no axe violations`, async ({ page }) => {
    await page.goto(path)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
}

test('the skip link is the first focusable element @smoke', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toHaveText(/skip to content/i)
})

// Covers the global `:focus-visible` rule in globals.css, not form fields. The
// brief named the contact form's Name input, but /contact/ renders no form while
// NEXT_PUBLIC_CONTACT_ENDPOINT is unprovisioned — ContactForm degrades to the
// booking link plus a mailto, which contact.spec.ts asserts deliberately. A
// header nav link is present in both shapes, so this does not break when the
// endpoint lands. Form-field focus coverage is deferred to phase 2, when the
// endpoint exists and the form actually renders.
test('an interactive element shows a visible focus indicator', async ({ page }) => {
  await page.goto('/contact/')
  const outline = await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link')
    .first()
    .evaluate((element) => {
      element.focus()
      return getComputedStyle(element).outlineStyle
    })
  expect(outline).not.toBe('none')
})
