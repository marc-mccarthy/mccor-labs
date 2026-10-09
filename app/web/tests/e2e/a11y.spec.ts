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
  '/lab/should-this-be-ai/',
  '/404.html',
] as const

for (const path of PATHS) {
  test(`${path} has no axe violations`, async ({ page }) => {
    await page.goto(path)
    await page.waitForFunction(
      () =>
        document.querySelector('[data-reveal="pending"]') === null &&
        [...document.querySelectorAll('[data-reveal]')]
          .filter((element) => element.getBoundingClientRect().top < window.innerHeight)
          .every((element) => getComputedStyle(element).opacity === '1'),
    )
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

test('every diagram has an accessible description', async ({ page }) => {
  let diagrams = 0
  for (const path of ['/', '/services/', '/work/', '/process/']) {
    await page.goto(path)
    const broken = await page.evaluate(() =>
      [...document.querySelectorAll('svg[role="img"]')]
        .filter(
          (svg) =>
            !svg.querySelector(':scope > title')?.textContent.trim() ||
            !svg.querySelector(':scope > desc')?.textContent.trim(),
        )
        .map((svg) => svg.outerHTML.slice(0, 80)),
    )
    expect(broken, path).toEqual([])
    diagrams += await page.locator('svg[role="img"]').count()
  }
  expect(diagrams).toBeGreaterThanOrEqual(3)
})

test('the 3D pipeline canvas is hidden from assistive tech and the SVG is described', async ({
  page,
}) => {
  await page.goto('/')
  const scene = page.locator('[aria-hidden="true"]:has([data-scene-status])')
  await expect(scene).not.toHaveCount(0)
  expect(await scene.locator('[role="img"], title, desc').count()).toBe(0)
  await expect(page.locator('svg[role="img"] > desc').first()).not.toBeEmpty()
})
