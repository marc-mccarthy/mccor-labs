import { expect, test, type Page } from '@playwright/test'

import { ui } from '@/content/ui'

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

test.describe('motion pause', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })

  const toggle = (page: Page) => page.getByRole('button', { name: ui.pauseMotion })

  const loopingOrScrollLinked = (page: Page) =>
    page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.effect?.getTiming().iterations === Infinity ||
              animation.timeline !== document.timeline,
          ).length,
    )

  const unpausedActiveScenes = (page: Page) =>
    page.locator('[data-scene-status="active"]:not([data-scene-paused])').count()

  const playingVideos = (page: Page) =>
    page.evaluate(
      () =>
        [...document.querySelectorAll('video')].filter((video) => !video.paused).length,
    )

  test('motion pause stops scenes and video', async ({ page }) => {
    await atViewport(page, 1440, 900)
    await page.goto('/', { waitUntil: 'load' })
    const hero = page.locator('section video').first()
    await expect(hero).toHaveCount(1)
    await expect
      .poll(() => hero.evaluate((node: HTMLVideoElement) => node.paused))
      .toBe(false)
    await expect(page.locator('[data-scene-status="active"]')).toHaveCount(1, {
      timeout: 15_000,
    })

    await toggle(page).click()
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused')
    await expect.poll(() => playingVideos(page)).toBe(0)
    expect(await unpausedActiveScenes(page)).toBe(0)

    await page.locator('[data-testid="systems-poster"]').scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)
    expect(await playingVideos(page)).toBe(0)
    expect(await unpausedActiveScenes(page)).toBe(0)

    await toggle(page).click()
    await expect(page.locator('html')).not.toHaveAttribute('data-motion', 'paused')
    await expect(page.locator('[data-scene-paused]')).toHaveCount(0)
    await expect.poll(() => playingVideos(page), { timeout: 15_000 }).toBeGreaterThan(0)
  })

  test('motion pause stops looping and scroll-linked animations', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' })
    await expect.poll(() => loopingOrScrollLinked(page)).toBeGreaterThan(0)

    await toggle(page).click()
    await expect.poll(() => loopingOrScrollLinked(page)).toBe(0)

    await page.keyboard.press('End')
    await page.waitForTimeout(600)
    expect(await loopingOrScrollLinked(page)).toBe(0)
  })

  test('motion pause toggle is visible at 390', async ({ page }) => {
    await atViewport(page, 390, 844)
    await page.goto('/')
    await expect(toggle(page)).toBeVisible()
    await expect(toggle(page)).toBeInViewport()
  })

  test('motion pause persists across reload before hydration', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' })
    await toggle(page).click()
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused')

    await page.route(
      (url) => url.pathname.startsWith('/_next/') && url.pathname.endsWith('.js'),
      (route) => route.abort(),
    )
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused')
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false')
    expect(await loopingOrScrollLinked(page)).toBe(0)
  })
})
