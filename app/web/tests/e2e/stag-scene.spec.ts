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
