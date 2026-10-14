import { expect, test, type Page } from '@playwright/test'

const STAGES = 7

const passedStages = (page: Page) => page.locator('[data-stage-state="passed"]').count()

const pipelineSection = (page: Page) =>
  page.locator('section', { has: page.locator('[data-stage-state]') })

const descriptorOpacities = (page: Page) =>
  page
    .locator('[data-stage-descriptor]')
    .evaluateAll((items) => items.map((item) => getComputedStyle(item).opacity))

test.describe('in motion mode', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })

  test('pipeline stages light as the packet passes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    const section = pipelineSection(page)
    await expect(section.locator('[data-scene-status]')).toHaveCount(1)

    const box = await section.boundingBox()
    expect(box?.y ?? 0).toBeGreaterThan(900)
    expect(await passedStages(page)).toBe(0)

    await section.evaluate((element) => {
      const top = element.getBoundingClientRect().top + window.scrollY
      window.scrollTo(0, top - window.innerHeight - 20)
    })
    await page.waitForTimeout(200)
    expect(await passedStages(page)).toBe(0)

    await page.mouse.move(720, 450)
    const seen = new Set<number>()
    for (let step = 0; step < 30; step += 1) {
      const bottom = await section.evaluate(
        (element) => element.getBoundingClientRect().bottom,
      )
      if (bottom < 0) break
      await page.mouse.wheel(0, 150)
      await page.waitForTimeout(80)
      seen.add(await passedStages(page))
    }

    await expect.poll(() => passedStages(page)).toBe(STAGES)
    expect([...seen].some((count) => count > 0 && count < STAGES)).toBe(true)
    expect(await descriptorOpacities(page)).toEqual(Array(STAGES).fill('1'))
  })
})

test.describe('under reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('pipeline stages light as the packet passes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await expect.poll(() => passedStages(page)).toBe(STAGES)
    expect(await descriptorOpacities(page)).toEqual(Array(STAGES).fill('1'))
    await expect(pipelineSection(page).locator('canvas')).toHaveCount(0)
  })
})
