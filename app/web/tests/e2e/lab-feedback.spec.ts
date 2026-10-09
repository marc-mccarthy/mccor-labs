import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { feedbackCopy } from '@/content/lab/feedback'

const LAB = '/lab/should-this-be-ai/'
const PRESET = /invoice intake/i

async function tabTo(page: Page, target: Locator, key: 'Tab' | 'Shift+Tab' = 'Tab') {
  for (let i = 0; i < 80; i += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return
    await page.keyboard.press(key)
  }
  throw new Error(`Keyboard focus never reached ${target.toString()}`)
}

async function captureBodies(page: Page, status = 202, body = '{"ok":true}') {
  const bodies: string[] = []
  await page.route('**/api/feedback', async (route) => {
    bodies.push(route.request().postData() ?? '')
    expect(route.request().headers()['x-amz-content-sha256']).toMatch(/^[0-9a-f]{64}$/)
    await new Promise((resolve) => setTimeout(resolve, 200))
    await route.fulfill({ status, contentType: 'application/json', body })
  })
  return bodies
}

async function openFirstControl(page: Page) {
  await page.goto(LAB)
  await page.getByRole('button', { name: PRESET }).click()
  const toggle = page.getByRole('button', { name: /^Wrong\?/ }).first()
  await toggle.click()
  return toggle
}

async function waitForReveals(page: Page) {
  await page.waitForFunction(
    () =>
      document.querySelector('[data-reveal="pending"]') === null &&
      [...document.querySelectorAll('[data-reveal]')]
        .filter(
          (element) =>
            element.getClientRects().length > 0 &&
            element.getBoundingClientRect().top < window.innerHeight,
        )
        .every((element) => getComputedStyle(element).opacity === '1'),
  )
}

async function expectTarget(page: Page, name: string | RegExp) {
  const box = await page.getByRole('button', { name }).first().boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
}

test.describe('verdict feedback', () => {
  test('a double click on Send sends one enum-only body', async ({ page }) => {
    const bodies = await captureBodies(page)
    await openFirstControl(page)
    await page.getByRole('radio', { name: 'A simpler tool would do' }).first().check()
    await page.getByRole('button', { name: feedbackCopy.send }).first().dblclick()
    await expect(page.getByText(/^Thanks\./).first()).toBeFocused()
    expect(bodies).toHaveLength(1)
    const sent = JSON.parse(bodies[0] ?? '{}') as Record<string, string>
    expect(Object.keys(sent).sort()).toEqual([
      'reason',
      'rubricVersion',
      'ruleId',
      'verdictId',
    ])
    expect(sent.ruleId).toMatch(/^R([1-9]|1[0-3])$/)
    expect(Buffer.byteLength(bodies[0] ?? '')).toBeLessThanOrEqual(512)
    await expect(page.locator('[role="status"]')).toHaveCount(1)
  })

  test('works from the keyboard alone', async ({ page }) => {
    const bodies = await captureBodies(page)
    await page.goto(LAB)
    await page.getByRole('button', { name: PRESET }).click()
    const toggle = page.getByRole('button', { name: /^Wrong\?/ }).first()
    await tabTo(page, toggle)
    await page.keyboard.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole('group', { name: feedbackCopy.legend }).getByRole('radio').first(),
    ).toBeFocused()
    await page.keyboard.press('Space')
    await page.keyboard.press('ArrowDown')
    await expect(
      page.getByRole('radio', { name: 'This needs more than that' }).first(),
    ).toBeChecked()
    await tabTo(page, page.getByRole('button', { name: feedbackCopy.send }).first())
    await page.keyboard.press('Enter')
    await expect(page.getByText(/^Thanks\./).first()).toBeFocused()
    expect(bodies).toHaveLength(1)
  })

  test('the open panel has no axe violations and 44 px targets at 390 px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openFirstControl(page)
    await waitForReveals(page)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations).toEqual([])
    await expectTarget(page, /^Wrong\?/)
    await expectTarget(page, feedbackCopy.send)
    for (const radio of await page.getByRole('radio').all()) {
      const box = await radio.locator('xpath=ancestor::label[1]').boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    }
  })

  test('shows the daily cap message', async ({ page }) => {
    await captureBodies(page, 429, '{"reason":"daily_cap"}')
    await openFirstControl(page)
    await page.getByRole('radio', { name: 'This needs more than that' }).first().check()
    await page.getByRole('button', { name: feedbackCopy.send }).first().click()
    await expect(page.getByText(feedbackCopy.dailyCap).first()).toBeFocused()
  })
})
