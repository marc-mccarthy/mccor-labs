import { expect, test } from '@playwright/test'

import { roles } from '@/content/careers'
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
        page.getByRole('heading', { level: 2, name: member.name }),
      ).toBeVisible()
    }
    await expect(page.locator('main a[href^="mailto:"]')).toHaveCount(4)
  })
})

test.describe('careers page', () => {
  test('renders every role with an exact application subject @smoke', async ({
    page,
  }) => {
    await page.goto('/careers/')
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('article')).toHaveCount(roles.length)
    expect(roles).toHaveLength(5)
    for (const role of roles) {
      const link = page.getByRole('link', {
        name: `Apply for ${role.title}`,
        exact: true,
      })
      const href = (await link.getAttribute('href')) ?? ''
      const subject = new URL(href).searchParams.get('subject')
      expect(subject).toBe(role.applySubject)
      expect(subject).toMatch(/^Application: /)
    }
  })
})

for (const path of ['/privacy/', '/terms/']) {
  test.describe(`legal page ${path}`, () => {
    test('one h1, no motion or effects, readable measure, visible TODOs @smoke', async ({
      page,
    }) => {
      await page.goto(path)
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('[data-reveal], canvas, video')).toHaveCount(0)
      await expect(page.getByText(/TODO\(owner\)/).first()).toBeVisible()
      const measures = await page.locator('article p').evaluateAll((paragraphs) =>
        paragraphs.map((p) => {
          const probe = document.createElement('span')
          probe.style.cssText = 'display:inline-block;width:1ch'
          p.appendChild(probe)
          const ch = probe.getBoundingClientRect().width
          probe.remove()
          return p.getBoundingClientRect().width / ch
        }),
      )
      for (const measure of measures) {
        expect(measure).toBeGreaterThanOrEqual(45)
        expect(measure).toBeLessThanOrEqual(80)
      }
    })
  })
}

test('the 404 page links home', async ({ page }) => {
  await page.goto('/404.html')
  await expect(page.getByRole('link', { name: /home/i }).last()).toHaveAttribute(
    'href',
    '/',
  )
})
