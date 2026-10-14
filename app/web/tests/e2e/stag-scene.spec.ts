import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

const SHOT_DIR = process.env.SCENE_SHOT_DIR ?? tmpdir()

test('stag scene renders to a WebGL canvas and is captured for review', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const scene = page.locator('[data-scene-status]').first()
  await expect(scene).not.toHaveAttribute('data-scene-status', 'idle', {
    timeout: 20_000,
  })
  const status = await scene.getAttribute('data-scene-status')
  test.skip(status !== 'active', `scene reported "${String(status)}": WebGL2 unavailable`)
  await page.waitForTimeout(6000)
  await page.screenshot({ path: join(SHOT_DIR, 'stag-scene.png') })
  await expect(scene.locator('canvas')).toBeVisible()
})

test('hero stag dissolves on scroll and reassembles on return', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const hero = page.locator('main section').first()
  const scene = hero.locator('[data-scene-status]')
  await expect(scene).not.toHaveAttribute('data-scene-status', 'idle', {
    timeout: 20_000,
  })
  const status = await scene.getAttribute('data-scene-status')
  test.skip(status !== 'active', `scene reported "${String(status)}": WebGL2 unavailable`)
  await expect(scene).toHaveAttribute('data-stag-exit', '0')

  const heroHeight = await hero.evaluate(
    (element) => element.getBoundingClientRect().height,
  )
  await page.evaluate((y) => {
    window.scrollTo(0, y)
  }, heroHeight * 0.8)
  await expect
    .poll(async () => Number(await scene.getAttribute('data-stag-exit')))
    .toBeGreaterThan(0)

  await page.evaluate(() => {
    window.scrollTo(0, 0)
  })
  await expect.poll(() => scene.getAttribute('data-stag-exit')).toBe('0')
})
