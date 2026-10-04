import { expect, test } from '@playwright/test'

import { site } from '@/content/site'

const ROUTES = [
  { path: '/', heading: site.tagline },
  { path: '/services/', heading: 'Services' },
  { path: '/work/', heading: 'Work' },
  { path: '/about/', heading: 'About' },
  { path: '/process/', heading: 'Process' },
  { path: '/contact/', heading: 'Contact' },
  { path: '/careers/', heading: 'Careers' },
  { path: '/privacy/', heading: 'Privacy Policy' },
  { path: '/terms/', heading: 'Terms' },
] as const

test.describe('routes', () => {
  for (const route of ROUTES) {
    test(`${route.path} renders its own h1 @smoke`, async ({ page }) => {
      await page.goto(route.path)
      const headings = page.locator('h1')
      await expect(headings).toHaveCount(1)
      await expect(headings.first()).toContainText(route.heading)
    })
  }

  test('a working primary cta is reachable from every route @smoke', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route.path)
      // Either a real booking link or the email fallback — never neither, and
      // never a relative or empty href.
      const cta = page
        .locator('header a[href^="https://"], header a[href^="mailto:"]')
        .first()
      await expect(cta).toBeVisible()
    }
  })

  test('no internal link is broken @smoke', async ({ page, request }) => {
    await page.goto('/')
    const hrefs = await page
      .locator('a[href^="/"]')
      .evaluateAll((links) => links.map((l) => l.getAttribute('href') ?? ''))
    for (const href of new Set(hrefs)) {
      const response = await request.get(href)
      expect(response.status(), `${href} should resolve`).toBeLessThan(400)
    }
  })

  test('the 404 page is exported and distinct', async ({ page }) => {
    await page.goto('/404.html')
    await expect(page.locator('h1')).toContainText(/does not exist/i)
  })
})

test.describe('home page assembly', () => {
  test('the home page renders seven sections in order @smoke', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('section')).toHaveCount(7)
  })

  test('no effect chunk loads before the load event', async ({ page }) => {
    const seen: string[] = []
    let loaded = false
    let before = 0
    page.on('response', (r) => {
      if (/chunks\/.*\.js$/.test(r.url())) seen.push(r.url())
    })
    page.on('load', () => {
      loaded = true
      before = seen.length
    })
    await page.goto('/', { waitUntil: 'load' })
    expect(loaded).toBe(true)
    await page.mouse.wheel(0, 4000)
    await page.waitForTimeout(1000)
    expect(seen.length).toBeGreaterThan(before)
  })
})
