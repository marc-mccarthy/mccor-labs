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

const ctaScene = '[data-stag-instance="cta"] [data-scene-status]'

test('CTA stag assembles on view at xl', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('/', { waitUntil: 'load' })
  const scene = page.locator(ctaScene)
  await expect(scene).toHaveAttribute('data-scene-status', 'idle', { timeout: 20_000 })
  await expect(scene).not.toHaveAttribute('data-stag-assembled', 'true')

  await page.locator('[data-stag-instance="cta"]').scrollIntoViewIfNeeded()
  await expect(scene).not.toHaveAttribute('data-scene-status', 'idle', {
    timeout: 20_000,
  })
  const status = await scene.getAttribute('data-scene-status')
  test.skip(status === 'fallback', 'scene reported "fallback": WebGL2 unavailable')
  await expect(scene).toHaveAttribute('data-scene-status', 'active')
  await expect(scene).toHaveAttribute('data-stag-assembled', 'true', { timeout: 10_000 })
  await expect(scene.locator('canvas')).toBeVisible()
})

test('CTA stag stays a webp below xl', async ({ page }) => {
  await page.addInitScript(() => {
    const holder = window as unknown as { stagContexts: string[] }
    holder.stagContexts = []
    const proto = HTMLCanvasElement.prototype
    const original = Reflect.get(proto, 'getContext') as (...args: unknown[]) => unknown
    Reflect.set(
      proto,
      'getContext',
      function (this: HTMLCanvasElement, ...args: unknown[]) {
        const kind = args[0]
        if (kind === 'webgl' || kind === 'webgl2') {
          const instance = this.closest('[data-stag-instance]')
          holder.stagContexts.push(
            instance?.getAttribute('data-stag-instance') ?? 'other',
          )
        }
        return Reflect.apply(original, this, args)
      },
    )
  })
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.goto('/', { waitUntil: 'load' })
  const scene = page.locator(ctaScene)
  await expect(scene).toHaveAttribute('data-scene-status', 'idle', { timeout: 20_000 })
  await expect(
    page.locator('[data-stag-instance="hero"] [data-scene-status]'),
  ).not.toHaveAttribute('data-scene-status', 'idle', { timeout: 20_000 })

  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight)
  })
  await page.waitForTimeout(3000)

  await expect(scene).toHaveAttribute('data-scene-status', 'idle')
  await expect(page.getByTestId('cta-stag')).toBeHidden()
  await expect(page.getByTestId('cta-stag')).toHaveAttribute(
    'src',
    /\/media\/brand\/mccor-stag-stride\.[0-9a-f]{8}\.webp/,
  )
  const contexts = await page.evaluate(
    () => (window as unknown as { stagContexts: string[] }).stagContexts,
  )
  expect(contexts).not.toContain('cta')
})
