import { expect, test } from '@playwright/test'

import { ROUTES, trackSceneRequests, trackThreeRequests } from './support'

test.use({ contextOptions: { reducedMotion: 'reduce' } })

test('all content renders and nothing animates under reduced motion @smoke', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible()
  await page.waitForTimeout(600)
  const running = await page.evaluate(() => document.getAnimations().length)
  expect(running).toBe(0)
})

test('no video autoplays under reduced motion', async ({ page }) => {
  await page.goto('/')
  const autoplaying = await page.evaluate(
    () => [...document.querySelectorAll('video')].filter((v) => v.autoplay).length,
  )
  expect(autoplaying).toBe(0)
})

for (const path of ROUTES) {
  test.describe(`reduced motion on ${path}`, () => {
    test('is static, native-scrolling, unpinned and never fetches three or a scene', async ({
      page,
    }) => {
      const threeRequests = trackThreeRequests(page)
      const sceneRequests = trackSceneRequests(page)
      await page.goto(path)
      await expect(page.locator('h1')).toBeVisible()
      await page.keyboard.press('End')
      await page.waitForTimeout(600)

      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)

      const hidden = await page.evaluate(() =>
        [...document.querySelectorAll('[data-reveal]')]
          .filter((element) => getComputedStyle(element).opacity !== '1')
          .map((element) => element.outerHTML.slice(0, 80)),
      )
      expect(hidden).toEqual([])

      const autoplaying = await page.evaluate(
        () => [...document.querySelectorAll('video')].filter((v) => v.autoplay).length,
      )
      expect(autoplaying).toBe(0)

      expect(
        await page.evaluate(() => document.documentElement.classList.contains('lenis')),
      ).toBe(false)
      const scrolled = await page.evaluate(
        () => window.scrollY > 0 || document.documentElement.scrollHeight <= innerHeight,
      )
      expect(scrolled).toBe(true)

      const sticky = await page.evaluate(
        () =>
          [
            ...document.querySelectorAll(
              'body *:not(header, header *, [data-sticky-layout])',
            ),
          ].filter((element) => getComputedStyle(element).position === 'sticky').length,
      )
      expect(sticky).toBe(0)

      const statuses = await page
        .locator('[data-scene-status]')
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-scene-status')))
      expect(statuses.filter((status) => status !== 'fallback')).toEqual([])

      expect(await threeRequests()).toEqual([])
      expect(await sceneRequests()).toEqual([])
    })
  })
}

test('the home page shows all three scene fallbacks without fetching three or a scene', async ({
  page,
}) => {
  const threeRequests = trackThreeRequests(page)
  const sceneRequests = trackSceneRequests(page)
  await page.goto('/')
  await page.waitForTimeout(1500)
  const statuses = await page
    .locator('[data-scene-status]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-scene-status')))
  expect(statuses).toEqual(['fallback', 'fallback', 'fallback'])
  expect(await threeRequests()).toEqual([])
  expect(await sceneRequests()).toEqual([])
})
