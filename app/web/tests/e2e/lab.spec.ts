import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import {
  answerCopy,
  builderCopy,
  fillTemplate,
  questionCopy,
  whyCopy,
} from '@/content/lab/copy'
import { QUESTION_KEYS } from '@/content/lab/rubric'

const PATH = '/lab/should-this-be-ai/'

async function openStep(page: Page, n: number) {
  const toggle = page.getByTestId(`step-${String(n)}`).locator('[data-step-toggle]')
  if (
    (await toggle.isVisible()) &&
    (await toggle.getAttribute('aria-expanded')) === 'false'
  ) {
    await toggle.click()
  }
}

async function answerStep(page: Page, n: number, name: string) {
  await openStep(page, n)
  const step = page.getByTestId(`step-${String(n)}`)
  await step.getByLabel(fillTemplate(builderCopy.stepNameLabel, { n })).fill(name)
  for (const key of QUESTION_KEYS) {
    await step
      .getByRole('group', { name: questionCopy[key].text })
      .getByRole('radio', { name: answerCopy.yes })
      .check()
  }
}

test.describe('lab at 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('/lab/should-this-be-ai/ filled with three steps and Why open has no axe violations', async ({
    page,
  }) => {
    await page.goto(PATH)
    const add = page.getByRole('button', { name: builderCopy.add })
    await add.click()
    await add.click()
    for (const [index, name] of [
      'Read invoices',
      'Match orders',
      'Approve payments',
    ].entries()) {
      await answerStep(page, index + 1, name)
    }
    await openStep(page, 1)
    const why = page.getByTestId('step-1').getByRole('button', { name: /^Why\?/ })
    await why.click()
    await expect(why).toHaveAttribute('aria-expanded', 'true')
    const showCode = page
      .getByTestId('step-1')
      .getByRole('button', { name: whyCopy.showCode })
    await showCode.click()
    await expect(showCode).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByTestId('step-1').getByRole('region')).toBeVisible()
    await page.waitForFunction(
      () => document.querySelector('[data-reveal="pending"]') === null,
    )
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
    expect(
      results.incomplete.filter((result) => result.id === 'aria-prohibited-attr'),
    ).toEqual([])
  })

  test('/lab/should-this-be-ai/ step controls are at least 44 by 44 px', async ({
    page,
  }) => {
    await page.goto(PATH)
    await page.getByRole('button', { name: builderCopy.add }).click()
    await openStep(page, 1)
    const targets = page.locator(
      '[data-testid^=step-] button:visible, [data-testid^=step-] a:visible, [data-testid^=step-] label:has(input[type=radio]):visible',
    )
    const count = await targets.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i += 1) {
      const target = targets.nth(i)
      const box = await target.boundingBox()
      const label = (await target.textContent()) ?? String(i)
      expect(box, label).not.toBeNull()
      expect(box!.width, label).toBeGreaterThanOrEqual(44)
      expect(box!.height, label).toBeGreaterThanOrEqual(44)
    }
  })

  test('/lab/should-this-be-ai/ a checked answer has a different fill from an unchecked one', async ({
    page,
  }) => {
    await page.goto(PATH)
    const group = page
      .getByTestId('step-1')
      .getByRole('group', { name: questionCopy.costly.text })
    await group.getByRole('radio', { name: answerCopy.yes, exact: true }).check()
    const fill = (name: string) =>
      group
        .locator('label', { has: page.getByRole('radio', { name, exact: true }) })
        .evaluate((element) => getComputedStyle(element).backgroundColor)
    expect(await fill(answerCopy.yes)).not.toBe(await fill(answerCopy.no))
  })
})
